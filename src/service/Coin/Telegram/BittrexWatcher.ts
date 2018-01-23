import BittrexCommand from "../Telegram/BittrexCommand"
import BittrexApi from "./BittrexApi"
import * as Extra from 'telegraf/extra'
import { REDIS, Redis } from "hinos-redis";
import { TradingTemp } from "../Crawler/RawHandler";
import BittrexAlert from "./BittrexAlert";
import { BotCommand } from "./Telegram";

export default class BittrexWatcher {

  static Bot = new BotCommand(AppConfig.app.telegram.WatcherBot)

  @REDIS()
  private static redis: Redis

  lastChangeNum = 0

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
    BittrexWatcher.Bot.startPolling()
  }

  private static registerWatch() {
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
          const rs = await BittrexWatcher.Bot.send(chat.id, `Watching ${key}`, Extra.markdown().markup(m => m.inlineKeyboard([
            m.callbackButton('🚫 UNWATCH', `unwatch ${key}`),
          ])))
          await BittrexWatcher.add(chat.id, rs.message_id, key)
        } else {
          if (Object.keys(BittrexWatcher.watchers).length <= 0) return await reply('No watcher')
          for (let key in BittrexWatcher.watchers) {
            const rs = await BittrexWatcher.Bot.send(chat.id, `Watching ${key}`, Extra.markdown().markup(m => m.inlineKeyboard([
              m.callbackButton('🚫 UNWATCH', `unwatch ${key}`),
            ])))
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
    const txt = [
      `[${this.key}](https://bittrex.com/Market/Index?MarketName=${this.key}) at *${time.toTimeString().split(' ')[0]}* ⏱`,
      '-----------------------------------------',
      `*LAST*   *${BittrexApi.formatNumber(t.last)}* _(${BittrexApi.formatNumber(this.lastChangeNum, true)})_`,
      '-----------------------------------------',
      `*ASK*     ${BittrexApi.formatNumber(t.ask)}`,
      `*BID*     ${BittrexApi.formatNumber(t.bid)}`,
      `*VOL*     ${BittrexApi.formatNumber(t.baseVolume)}`
    ]
    let btn = [[{ label: '🚫 UNWATCH', cmd: `unwatch ${t.key}` }]] as any[][]
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
      btn.splice(0, 0, sort.map((e, i) => {
        return { label: `${i}`, cmd: `unalert ${t.key} ${e._id}` }
      }))
      btn[1].push({ label: '⚠️ CLEAR', cmd: `unalert ${t.key}` })
    }
    try {
      return await BittrexWatcher.Bot.editMessageText(this.chatId, this.messageId, undefined, txt.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
        btn.map(bn => {
          return bn.map(e => m.callbackButton(e.label, e.cmd))
        })
      )))
    } catch (e) {
      console.log(e)
      // await this.remove()
    }
  }
}