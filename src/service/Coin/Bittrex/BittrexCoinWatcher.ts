import BittrexVNBot from "../Telegram/BittrexVNBot"
import BittrexApi from "./BittrexApi"
import * as Extra from 'telegraf/extra'
import { REDIS, Redis } from "hinos-redis";
import { TradingTemp } from "../Crawler/RawHandler";
import BittrexAlert from "./BittrexAlert";

export default class BittrexCoinWatcher {
  @REDIS()
  private static redis: Redis

  lastChangeNum = 0

  static watchers = {} as { [key: string]: BittrexCoinWatcher }

  constructor(public chatId, public messageId, public key) {

  }

  static async add(chatId, messageId, key) {
    let w = BittrexCoinWatcher.watchers[key]
    if (!w) {
      w = new BittrexCoinWatcher(chatId, messageId, key)
      BittrexCoinWatcher.watchers[key] = w
    } else {
      BittrexVNBot.Bot.deleteMessage(w.chatId, w.messageId)
      w.chatId = chatId
      w.messageId = messageId
    }
    w.save()
    return w
  }

  static async init() {
    const ws = await BittrexCoinWatcher.redis.hget(`bittrex.watchers`)
    if (ws) {
      for (let key in ws) {
        const { chatId, messageId } = JSON.parse(ws[key])
        BittrexCoinWatcher.watchers[key] = new BittrexCoinWatcher(chatId, messageId, key)
      }
    }
    Redis.subscribe('updateData', async (data) => {
      const { tradings } = JSON.parse(data)
      for (let key in BittrexCoinWatcher.watchers) {
        const t = tradings.find(e => e.key === key)
        const w = BittrexCoinWatcher.watchers[key]
        if (t && w) await w.update(t)
      }
    }, AppConfig.redis)
  }

  async save() {
    const self = this
    await BittrexCoinWatcher.redis.hset(`bittrex.watchers`, {
      [self.key]: JSON.stringify(self)
    })
    BittrexCoinWatcher.watchers[this.key] = this
  }

  async remove() {
    await BittrexCoinWatcher.redis.hdel(`bittrex.watchers`, [this.key])
    delete BittrexCoinWatcher.watchers[this.key]
  }

  async update(t: TradingTemp) {
    const time = new Date(t.time)
    if (t.num) this.lastChangeNum = t.num
    const txt = [
      `⏱ [${this.key}](https://bittrex.com/Market/Index?MarketName=${this.key}) at *${time.toTimeString().split(' ')[0]}* ⏱`,
      '-----------------------------------------',
      `*LAST*   *${BittrexApi.formatNumber(t.last)}* _(${BittrexApi.formatNumber(this.lastChangeNum, true)})_`,
      '-----------------------------------------',
      `*ASK*     ${BittrexApi.formatNumber(t.ask)}`,
      `*BID*     ${BittrexApi.formatNumber(t.bid)}`,
      `*VOL*     ${BittrexApi.formatNumber(t.baseVolume)}`
    ]
    let als = BittrexAlert.alerts.filter(e => e.key === t.key)
    let btn = [[{ label: '🚫 UNWATCH', cmd: `unwatch ${t.key}` }]] as any[][]
    if (als.length > 0) {
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
      btn[1].push({ label: '⚠️ CLEAR', cmd: `unalert ${t.key} ${als.map(e => e._id).join(',')}` })
    }
    try {
      return await BittrexVNBot.Bot.editMessageText(this.chatId, this.messageId, undefined, txt.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
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