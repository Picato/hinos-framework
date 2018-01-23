import BittrexApi from "./BittrexApi"
import { REDIS, Redis } from "hinos-redis";
import { TradingTemp } from "../Crawler/RawHandler";
import { BotCommand } from "./Telegram"
import BittrexWatcher from "./BittrexWatcher";

export default class BittrexAlert {
  static Bot = new BotCommand(AppConfig.app.telegram.AlertBot)

  @REDIS()
  private static redis: Redis

  static alerts = {} as { [key: string]: BittrexAlert[] }

  static async init() {
    console.log('TELEGRAM', 'BittrexAlert', 'init')
    BittrexAlert.initCommand()
    let als = await BittrexAlert.redis.hget(`bittrex.alerts`)
    if (als) {
      for (let k in als) {
        for (const { chatId, key, formula, des, _id } of JSON.parse(als[k])) {
          await BittrexAlert.add(_id, chatId, key, formula, des)
        }
      }
    }
    // Redis.subscribe('updateData', async (data) => {
    //   const { tradings } = JSON.parse(data)
    //   await BittrexAlert.check(tradings)
    // }, AppConfig.redis)
  }

  private static initCommand() {
    BittrexAlert.registerAddAlert()
    BittrexAlert.Bot.startPolling()
  }

  constructor(public _id = BittrexApi.getId(), public chatId, public key: string, public formula: { operation: string, num: number }, public des: string) {

  }

  static getListAlertTxt() {
    const msgs = []
    for (let key in BittrexAlert.alerts) {
      const als = BittrexAlert.alerts[key]
      msgs.push(`[${key}](https://bittrex.com/Market/Index?MarketName=${key})`)
      als.forEach((e, i) => {
        msgs.push(`*${i + 1}.* ${e.formula.operation} ${e.formula.num}`)
      })
    }
    return msgs
  }

  static registerAddAlert() {
    BittrexAlert.Bot.command('nw', async (ctx) => {
      const { reply, message, chat } = ctx
      try {
        const [kf, des] = message.text.split('\n')
        let [, key, ...formula] = kf.toUpperCase().split(' ')
        formula = formula.join('') as string
        if (!key || !formula) return await reply('Not found market-coin or formular')
        if (!formula.includes('<') && !formula.includes('>') && !formula.includes('=')) return await reply('Formula need includes atlest 1 in ">", "<", ">=", "<=", "=="')
        const m = formula.match(/([^\d\.]+)([\d\.]+\$?)/)
        await BittrexAlert.add(undefined, chat.id, key, { operation: m[1], num: BittrexApi.getQuickPrice(m[2]) }, des)
        // await replyWithMarkdown(BittrexAlert.getListAlertTxt().join('\n'), Extra.markdown())
        const rs = await BittrexWatcher.Bot.send(chat.id, `Added alert for ${key}`)
        await BittrexWatcher.add(chat.id, rs.message_id, key)
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  static async remove(key, id) {
    if (id === undefined) {
      BittrexAlert.alerts[key] = []
    } else {
      const idx = BittrexAlert.alerts[key].findIndex(e => e._id === id)
      BittrexAlert.alerts[key].splice(idx, 1)
    }
    await BittrexAlert.save()
  }

  static async add(_id, chatId, key, formula, des) {
    const b = new BittrexAlert(_id, chatId, key, formula, des)
    if (!BittrexAlert.alerts[key]) BittrexAlert.alerts[key] = []
    BittrexAlert.alerts[key].push(b)
    await BittrexAlert.save()
    return b
  }

  static async save() {
    const rs = {} as any
    for (let k in BittrexAlert.alerts) {
      rs[k] = JSON.stringify(BittrexAlert.alerts[k])
    }
    await BittrexAlert.redis.hset(`bittrex.alerts`, rs)
  }

  static async runBackground(tradings: TradingTemp[]) {
    // console.log('TELEGRAM', 'BittrexAlert', 'runBackground')
    const alerts = BittrexAlert.alerts
    for (let key in alerts) {
      const ls = alerts[key]
      if (ls.length === 0) continue
      const t = tradings.find(e => e.key === key)
      for (let i = ls.length - 1; i >= 0; i--) {
        const alert = ls[i]
        if (!t) {
          await BittrexAlert.Bot.send(alert.chatId, `Could not found "${key}"`, { parse_mode: 'Markdown' })
          await BittrexAlert.remove(key, alert._id)
        } else {
          const $ = t.last
          if ($) {
            let isok
            try {
              eval(`isok = $ ${alert.formula.operation} ${alert.formula.num}`)
              if (isok) {
                const msgs = [
                  `🎉🎉🎉 [${alert.key}](https://bittrex.com/Market/Index?MarketName=${alert.key}) 🎉🎉🎉`,
                  '-----------------------------------------',
                  `*LAST*             ${BittrexApi.formatNumber(t.last)}`,
                  `*EXPECTED*   ${alert.formula.operation} ${BittrexApi.formatNumber(alert.formula.num)}`
                ]
                if (alert.des) {
                  msgs.push('-----------------------------------------')
                  msgs.push(`_${alert.des}_`)
                }
                await BittrexAlert.Bot.send(alert.chatId, `${msgs.join('\n')}`, { parse_mode: 'Markdown' })
                await BittrexAlert.remove(key, alert._id)
              }
            } catch (_e) {
              await BittrexAlert.remove(key, alert._id)
              await BittrexAlert.Bot.send(alert.chatId, `Formula *${alert.formula.operation} ${BittrexApi.formatNumber(alert.formula.num)}* got problem`, { parse_mode: 'Markdown' })
            }
          }
        }
      }
    }
  }
}