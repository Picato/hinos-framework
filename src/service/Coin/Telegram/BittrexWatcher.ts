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
import { Cached } from "./Cached";
import HttpError from "../../../common/HttpError";

export default class BittrexWatcher {

  static Bot = new BotCommand(AppConfig.app.telegram.WatcherBot)

  @REDIS()
  private static redis: Redis

  lastChangeNums = []

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
  }

  static async runBackground() {
    for (let key in BittrexWatcher.watchers) {
      const w = BittrexWatcher.watchers[key]
      if (key.startsWith('BUY-') || key.startsWith('SELL-')) {
        await w.updateRateByKey(key, Cached.vnd)
      } else if (key !== 'RATE') {
        const t = Cached.tradings.find(e => e.key === key)
        if (t) await w.update(t)
      } else {
        await w.updateRate(key, Cached.rate, Cached.vnd)
      }
    }
  }

  static async add(chatId, messageId, key) {
    let w = BittrexWatcher.watchers[key]
    if (!w) {
      w = new BittrexWatcher(chatId, messageId, key)
      BittrexWatcher.watchers[key] = w
    } else {
      try {
        await BittrexWatcher.Bot.deleteMessage(w.chatId, w.messageId)
      } catch (e) { }
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
        // await replyWithMarkdown(BittrexAlert.getListAlertTxt().join('\n'), Extra.markdown())
        await BittrexAlert.add(undefined, from.id.toString(), chat.id, key, { operation: m[1], num: BittrexApi.getQuickPrice(m[2]) }, des)
        const rs = await BittrexWatcher.Bot.send(chat.id, `Added alert for ${key}`)
        await BittrexWatcher.add(chat.id, rs.message_id, key)
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerWatch() {
    BittrexWatcher.Bot.command('lh', async (ctx) => {
      const { reply, replyWithMarkdown, message } = ctx
      try {
        let [, key, time] = message.text.split(' ')
        if (time) {
          let tr
          let lb
          if (time === '3m') {
            lb = 'IN 3 MINUTES'
            tr = await HandlerMin3.getTradings() as TradingMin[]
          } else if (time === '15m') {
            lb = 'IN 15 MINUTES'
            tr = await HandlerMin15.getTradings() as TradingMin[]
          } else if (time === '30m') {
            lb = 'IN 30 MINUTES'
            tr = await HandlerMin30.getTradings() as TradingMin[]
          } else if (time === '1h') {
            lb = 'IN 1 HOUR'
            tr = await HandlerHour1.getTradings() as TradingMin[]
          } else if (time === '1d') {
            lb = 'IN 1 DAY'
            tr = await HandlerDay1.getTradings() as TradingMin[]
          }
          key = key.toUpperCase()
          const c = tr.find(e => e.key === key)
          if (!c) throw HttpError.BAD_REQUEST('Could not found market coin')
          const [market] = key.split('-')
          const txt = [`🚀 *${key}* ${lb} 🚀`, '-----------------------------------------']
          if (c) {
            txt.push(`*Last*     ${BittrexApi.formatNumber(c.last)} ${market} 🚀`)
            txt.push(`*Low*     ${BittrexApi.formatNumber(c.low)} ${market}`)
            txt.push(`*High*    ${BittrexApi.formatNumber(c.high)} ${market}`)
          }
          await replyWithMarkdown(txt.join('\n'), Extra.markdown())
        }
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
          const rs = await reply(`Watching ${key}`, Extra.markdown().markup(m => m.inlineKeyboard(
            [{ label: '🚫 UNWATCH', cmd: `unwatch ${key}` }]
          )))
          await BittrexWatcher.add(chat.id, rs.message_id, key)
        } else {
          if (Object.keys(BittrexWatcher.watchers).length <= 0) return await reply('No watcher')
          for (let key in BittrexWatcher.watchers) {
            const rs = await reply(`Watching ${key}`, Extra.markdown().markup(m => m.inlineKeyboard(
              [{ label: '🚫 UNWATCH', cmd: `unwatch ${key}` }]
            )))
            await BittrexWatcher.add(chat.id, rs.message_id, key)
          }
        }
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private async updateRateByKey(key, vnd) {
    const msgs = BittrexCommand.getRateStr('BUYING REMITANO', undefined, vnd)
    let btn = [] as any[][]
    let $ = vnd[BittrexAlert.REMITANO[key]] // tslint:disable-line
    try { // nw usdt-vnd
      let als = (BittrexAlert.alerts[key] || [])
      if ($ && als.length > 0) {
        msgs.push('-----------------------------------------')
        const sort = als.map((e: any) => {
          eval(`e.buf = $ - ${e.formula.num}`)
          e.buf = e.buf * -1
          e.sign = e.buf < 0 ? '' : '+'
          return e
        })
        sort.sort((a, b) => a.buf - b.buf)
        msgs.push(sort.map((e) => `🛎 ${key} ${e.formula.operation} ${BittrexApi.formatNumber(e.formula.num, false, 0)} *(${e.sign}${BittrexApi.formatNumber(e.buf, false, 0)})*${e.des ? `\n_     - ${e.des}_` : ''}`).join('\n'))
        btn.push([
          ...sort.map((e, i) => {
            return { label: `${i}`, cmd: `unalert ${key} ${e._id}` }
          }),
          { label: '⚠️CLEAR', cmd: `unalert ${key}` }
        ])
      }
      btn.push([{ label: '🚫 UNWATCH', cmd: `unwatch ${key}` }])
      return await BittrexWatcher.Bot.editMessageText(this.chatId, this.messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
        btn.map(bn => {
          return bn.map(e => m.callbackButton(e.label, e.cmd))
        })
      )))
    } catch (e) {
      console.error('BittrextWatcher.updateRateByKey', e)
      // await this.remove()
    }
  }

  private async updateRate(key, rate, vnd) {
    const msgs = BittrexCommand.getRateStr('WATCH RATE', rate, vnd)
    let btn = [[{ label: '🚫 UNWATCH', cmd: `unwatch ${this.key}` }]] as any[][]
    try { // nw usdt-vnd
      let als = BittrexAlert.alerts[key]
      if (als && als.length > 0) {
        msgs.push('-----------------------------------------')
        const sort = als.map((e: any) => {
          eval(`e.buf = t.last - ${e.formula.num}`)
          e.buf = e.buf * -1
          e.sign = e.buf < 0 ? '' : '+'
          return e
        })
        sort.sort((a, b) => a.buf - b.buf)
        msgs.push(sort.map((e) => `🛎 ${e.formula.operation} ${BittrexApi.formatNumber(e.formula.num)} *(${e.sign}${BittrexApi.formatNumber(e.buf)})*${e.des ? `\n_     - ${e.des}_` : ''}`).join('\n'))
        btn.push([
          ...sort.map((e, i) => {
            return { label: `${i}`, cmd: `unalert RATE ${e._id}` }
          }),
          { label: '⚠️CLEAR', cmd: `unalert RATE` }
        ])
      }
      return await BittrexWatcher.Bot.editMessageText(this.chatId, this.messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
        btn.map(bn => {
          return bn.map(e => m.callbackButton(e.label, e.cmd))
        })
      )))
    } catch (e) {
      console.error('BittrextWatcher.updateRate', e)
      // await this.remove()
    }
  }

  private async update(t: TradingTemp) {
    const time = new Date(t.time)
    if (t.num) this.lastChangeNums.splice(0, 0, t.num)
    if (this.lastChangeNums.length > 5) this.lastChangeNums.splice(5, 1)
    const [market,] = t.key.split('-')
    const txt = [
      `⏱ *${time.toTimeString().split(' ')[0]}* ⏱`,
      '-----------------------------------------',
      `[${this.key}](https://bittrex.com/Market/Index?MarketName=${this.key})    *${BittrexApi.formatNumber(t.last)}* ${market} 🚀`,
      ...this.lastChangeNums.map(e => `                    _${BittrexApi.formatNumber(e, true)}_`),
      '-----------------------------------------',
      `          *Ask*    ${BittrexApi.formatNumber(t.ask)} ${market}`,
      `          *Bid*    ${BittrexApi.formatNumber(t.bid)} ${market}`
    ]
    let btn = [] as any[][]
    let als = (BittrexAlert.alerts[t.key] || []).filter(e => e.key !== 'RATE')
    if (als.length > 0) {
      txt.push('-----------------------------------------')
      const sort = als.map((e: any) => {
        eval(`e.buf = t.last - ${e.formula.num}`)
        e.buf = e.buf * -1
        e.sign = e.buf < 0 ? '' : '+'
        return e
      })
      sort.sort((a, b) => a.buf - b.buf)
      txt.push(sort.map((e) => `🛎 ${e.formula.operation} ${BittrexApi.formatNumber(e.formula.num)} *(${e.sign}${BittrexApi.formatNumber(e.buf)})*${e.des ? `\n_     - ${e.des}_` : ''}`).join('\n'))
      btn.push([
        ...sort.map((e, i) => {
          return { label: `${i}`, cmd: `unalert ${t.key} ${e._id}` }
        }),
        { label: '⚠️CLEAR', cmd: `unalert ${t.key}` }
      ])
    }
    btn.push([
      { label: '🚫 UNWATCH', cmd: `unwatch ${t.key}` }
    ])
    try {
      return await BittrexWatcher.Bot.editMessageText(this.chatId, this.messageId, undefined, txt.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
        btn.map(bn => {
          return bn.map(e => m.callbackButton(e.label, e.cmd))
        })
      )))
    } catch (e) {
      console.error('BittrextWatcher.update', e)
      // await this.remove()
    }
  }
}