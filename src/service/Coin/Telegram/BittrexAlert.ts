import BittrexApi from "./BittrexApi"
import { REDIS, Redis } from "hinos-redis";
import { TradingTemp } from "../Crawler/RawHandler";
import { BotCommand } from "./Telegram"

export default class BittrexAlert {
  static Bot = new BotCommand(AppConfig.app.telegram.AlertBot)

  @REDIS()
  private static redis: Redis

  static alerts = {} as { [key: string]: BittrexAlert[] }
  static notifications = {} as { [user: string]: { chatId: number, messageId: number } }

  static async init() {
    console.log('TELEGRAM', 'BittrexAlert', 'init')
    BittrexAlert.initCommand()
    let notices = await BittrexAlert.redis.get(`bittrex.alerts.notifications`)
    if (notices) BittrexAlert.notifications = JSON.parse(notices)

    let als = await BittrexAlert.redis.hget(`bittrex.alerts`)
    if (als) {
      for (let k in als) {
        for (const { chatId, user, key, formula, des, _id } of JSON.parse(als[k])) {
          await BittrexAlert.add(_id, user, chatId, key, formula, des)
        }
      }
    }
    // Redis.subscribe('updateData', async (data) => {
    //   const { tradings } = JSON.parse(data)
    //   await BittrexAlert.check(tradings)
    // }, AppConfig.redis)
  }

  private static initCommand() {
    BittrexAlert.registerNotifyAlert()
    // BittrexAlert.registerAddAlert()
    BittrexAlert.Bot.startPolling()
  }

  constructor(public _id = BittrexApi.getId(), public user: string, public chatId, public key: string, public formula: { operation: string, num: number }, public des: string) {

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

  static registerNotifyAlert() {
    BittrexAlert.Bot.start(async (ctx) => {
      const { reply, chat, from } = ctx
      const rs = reply('Added notification channel')
      BittrexAlert.notifications[from.id.toString()] = { chatId: chat.id, messageId: rs.message_id }
      await BittrexAlert.redis.set(`bittrex.alerts.notifications`, JSON.stringify(BittrexAlert.notifications))
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

  static async add(_id, user, chatId, key, formula, des) {
    const b = new BittrexAlert(_id, user, chatId, key, formula, des)
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
        const al = BittrexAlert.notifications[alert.user]
        if (!t) {
          // await BittrexAlert.Bot.deleteMessage(al.chatId, al.messageId)
          await BittrexAlert.Bot.send(al.chatId, `Could not found "${key}"`, { parse_mode: 'Markdown' })
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
                await BittrexAlert.Bot.send(al.chatId, `${msgs.join('\n')}`, { parse_mode: 'Markdown' })
                await BittrexAlert.remove(key, alert._id)
              }
            } catch (_e) {
              await BittrexAlert.remove(key, alert._id)
              await BittrexAlert.Bot.send(al.chatId, `Formula *${alert.formula.operation} ${BittrexApi.formatNumber(alert.formula.num)}* got problem`, { parse_mode: 'Markdown' })
            }
          }
        }
      }
    }
  }
}