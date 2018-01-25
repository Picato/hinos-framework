import BittrexCommand from "../Telegram/BittrexCommand"
import BittrexApi from "./BittrexApi"
import * as Extra from 'telegraf/extra'
import { REDIS, Redis } from "hinos-redis";
import { TradingTemp } from "../Crawler/RawHandler";
import BittrexAlert from "./BittrexAlert";
import { BotCommand } from "./Telegram";
import { TradingMin } from "../Crawler/AbsHandlerMin";
import HandlerMin3 from "../Crawler/HandlerMin3";
import HandlerMin15 from "../Crawler/HandlerMin15";
import HandlerHour1 from "../Crawler/HandlerHour1";
import HandlerMin30 from "../Crawler/HandlerMin30";
import HandlerDay1 from "../Crawler/HandlerDay1";

export default class BittrexWatcher {

  static Bot = new BotCommand(AppConfig.app.telegram.WatcherBot)

  @REDIS()
  private static redis: Redis

  lastChangeNum = 0
  lowHigh

  static watchers = {} as { [key: string]: BittrexWatcher }

  constructor(public chatId, public messageId, public key) { }

  static async init() {
    console.log('TELEGRAM', 'BittrexWatcher', 'init')
    BittrexWatcher.initCommand()
    const ws = await BittrexWatcher.redis.hget(`bittrex.watchers`)
    if (ws) {
      for (let key in ws) {
        const { chatId, messageId } = JSON.parse(ws[key])
        BittrexWatcher.watchers[key] = new BittrexWatcher(chatId, messageId, key)
      }
    }
    // Redis.subscribe('updateData', async (data) => {
    //   const { tradings } = JSON.parse(data)
    //   await BittrexWatcher.check(tradings)
    // }, AppConfig.redis)
  }

  static async runBackground(tradings: TradingTemp[]) {
    // console.log('TELEGRAM', 'BittrexWatcher', 'runBackground')
    for (let key in BittrexWatcher.watchers) {
      const w = BittrexWatcher.watchers[key]
      if (key !== 'RATE') {
        const t = tradings.find(e => e.key === key)
        if (t) await w.update(t)
      } else {
        await w.updateRate()
      }
    }
  }

  static async add(chatId, messageId, key) {
    let w = BittrexWatcher.watchers[key]
    if (!w) {
      w = new BittrexWatcher(chatId, messageId, key)
      BittrexWatcher.watchers[key] = w
    } else {
      await BittrexWatcher.Bot.deleteMessage(w.chatId, w.messageId)
      w.chatId = chatId
      w.messageId = messageId
    }
    w.save()
    return w
  }

  async save() {
    const self = this
    await BittrexWatcher.redis.hset(`bittrex.watchers`, {
      [self.key]: JSON.stringify(self)
    })
    BittrexWatcher.watchers[this.key] = this
  }

  async remove() {
    await BittrexWatcher.redis.hdel(`bittrex.watchers`, [this.key])
    delete BittrexWatcher.watchers[this.key]
  }

  private static initCommand() {
    BittrexWatcher.registerWatch()
    BittrexWatcher.registerAddAlert()
    BittrexWatcher.Bot.startPolling()
  }

  private static registerAddAlert() {
    BittrexWatcher.Bot.command('nw', async (ctx) => {
      const { reply, message, chat, from } = ctx
      try {
        const [kf, des] = message.text.split('\n')
        let [, key, ...formula] = kf.toUpperCase().split(' ')
        formula = formula.join('') as string
        if (!key || !formula) return await reply('Not found market-coin or formular')
        if (!formula.includes('<') && !formula.includes('>') && !formula.includes('=')) return await reply('Formula need includes atlest 1 in ">", "<", ">=", "<=", "=="')
        const m = formula.match(/([^\d\.]+)([\d\.]+\$?)/)
        await BittrexAlert.add(undefined, from.id.toString(), chat.id, key, { operation: m[1], num: BittrexApi.getQuickPrice(m[2]) }, des)
        // await replyWithMarkdown(BittrexAlert.getListAlertTxt().join('\n'), Extra.markdown())
        const rs = await BittrexWatcher.Bot.send(chat.id, `Added alert for ${key}`)
        await BittrexWatcher.add(chat.id, rs.message_id, key)
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerWatch() {
    BittrexWatcher.Bot.action(/lowhigh .+/, async (ctx) => {
      const { reply, match } = ctx
      try {
        const [, key, time] = match[0].split(' ')
        BittrexWatcher.watchers[key].lowHigh = time
        await BittrexWatcher.watchers[key].save()
      } catch (e) {
        await reply(e.message || e)
      }
    })
    BittrexWatcher.Bot.action(/unalert .+/, async (ctx) => {
      const { reply, match } = ctx
      try {
        const [, key, _id] = match[0].split(' ')
        if (!key) return await reply('Not found market-coin')
        await BittrexAlert.remove(key, _id ? _id.split(',') : _id)
      } catch (e) {
        await reply(e.message || e)
      }
    })
    BittrexWatcher.Bot.action(/unwatch .+/, async (ctx) => {
      const { editMessageText, match } = ctx
      try {
        const [, key] = match[0].split(' ')
        if (BittrexWatcher.watchers[key]) await BittrexWatcher.watchers[key].remove()
        await editMessageText(`🚫 Unwatched ${key}`)
        // await deleteMessage()
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexWatcher.Bot.command('watch', async (ctx) => {
      const { reply, message, chat } = ctx
      try {
        let [, key] = message.text.split(' ')
        if (key) {
          key = key.toUpperCase()
          const rs = await reply(`Watching ${key}`)
          await BittrexWatcher.add(chat.id, rs.message_id, key)
        } else {
          if (Object.keys(BittrexWatcher.watchers).length <= 0) return await reply('No watcher')
          for (let key in BittrexWatcher.watchers) {
            const rs = reply(`Watching ${key}`)
            await BittrexWatcher.add(chat.id, rs.message_id, key)
          }
        }
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private async updateRate() {
    const msgs = await BittrexCommand.getRateStr()
    let btn = [[{ label: '🚫 UNWATCH', cmd: `unwatch ${this.key}` }]] as any[][]
    try {
      return await BittrexWatcher.Bot.editMessageText(this.chatId, this.messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
        btn.map(bn => {
          return bn.map(e => m.callbackButton(e.label, e.cmd))
        })
      )))
    } catch (e) {
      console.log(e)
      // await this.remove()
    }
  }

  private async update(t: TradingTemp) {
    const time = new Date(t.time)
    if (t.num) this.lastChangeNum = t.num
    const [market,] = t.key.split('-')
    const txt = [
      `⏱ *${time.toTimeString().split(' ')[0]}* ⏱`,
      '-----------------------------------------',
      `[${this.key}](https://bittrex.com/Market/Index?MarketName=${this.key})  *${BittrexApi.formatNumber(t.last)}* ${market} 🚀`,
      `                 _${BittrexApi.formatNumber(this.lastChangeNum, true)}_`,
      '-----------------------------------------',
      `          *Ask*   ${BittrexApi.formatNumber(t.ask)} ${market}`,
      `          *Bid*   ${BittrexApi.formatNumber(t.bid)} ${market}`
    ]
    let btn = [] as any[][]
    let als = BittrexAlert.alerts[t.key]
    if (als && als.length > 0) {
      txt.push('-----------------------------------------')
      const sort = als.map((e: any) => {
        eval(`e.buf = t.last - ${e.formula.num}`)
        e.buf = e.buf * -1
        e.sign = e.buf < 0 ? '' : '+'
        return e
      })
      sort.sort((a, b) => a.buf - b.buf)
      txt.push(sort.map((e, i) => `*${i}.* ${e.formula.operation} ${BittrexApi.formatNumber(e.formula.num)} *(${e.sign}${BittrexApi.formatNumber(e.buf)})* _${e.des ? `\n     - ${e.des}` : ''}_`).join('\n'))
      btn.push([
        ...sort.map((e, i) => {
          return { label: `${i}`, cmd: `unalert ${t.key} ${e._id}` }
        }),
        { label: '⚠️CLEAR', cmd: `unalert ${t.key}` }
      ])
    }
    btn.push([
      { label: `3m`, cmd: `lowhigh ${t.key} HandlerMin3` },
      { label: `15m`, cmd: `lowhigh ${t.key} HandlerMin15` },
      { label: `30m`, cmd: `lowhigh ${t.key} HandlerMin30` }
    ])
    btn.push([
      { label: `1h`, cmd: `lowhigh ${t.key} HandlerHour1` },
      { label: `24h`, cmd: `lowhigh ${t.key} HandlerDay1` },
      { label: `🚫`, cmd: `lowhigh ${t.key}` }
    ])
    btn.push([
      { label: '🚫 UNWATCH', cmd: `unwatch ${t.key}` }
    ])
    if (this.lowHigh) {
      let tr
      let lb
      if (this.lowHigh === 'HandlerMin3') {
        lb = 'IN 3 MINUTES'
        tr = await HandlerMin3.getTradings() as TradingMin[]
      } else if (this.lowHigh === 'HandlerMin15') {
        lb = 'IN 15 MINUTES'
        tr = await HandlerMin15.getTradings() as TradingMin[]
      } else if (this.lowHigh === 'HandlerMin30') {
        lb = 'IN 30 MINUTES'
        tr = await HandlerMin30.getTradings() as TradingMin[]
      } else if (this.lowHigh === 'HandlerHour1') {
        lb = 'IN 1 HOUR'
        tr = await HandlerHour1.getTradings() as TradingMin[]
      } else if (this.lowHigh === 'HandlerDay1') {
        lb = 'IN 1 DAY'
        tr = await HandlerDay1.getTradings() as TradingMin[]
      }
      const c = tr.find(e => e.key === this.key)
      if (c) {
        txt.push('-----------------------------------------')
        txt.push(`*${lb}*`)
        txt.push(`*Low*     ${BittrexApi.formatNumber(c.low)}`)
        txt.push(`*High*    ${BittrexApi.formatNumber(c.high)}`)
        txt.push('-----------------------------------------')
      }
    }
    try {
      return await BittrexWatcher.Bot.editMessageText(this.chatId, this.messageId, undefined, txt.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
        btn.map(bn => {
          return bn.map(e => m.callbackButton(e.label, e.cmd))
        })
      )))
    } catch (e) {
      console.log(e)
      await this.remove()
    }
  }
}