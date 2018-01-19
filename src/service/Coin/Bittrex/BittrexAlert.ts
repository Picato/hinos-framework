import BittrexVNBot from "../Telegram/BittrexVNBot"
import BittrexApi from "./BittrexApi"
import { REDIS, Redis } from "hinos-redis";
import { TradingTemp } from "../Crawler/RawHandler";

export default class BittrexAlert {
  @REDIS()
  private static redis: Redis

  static alerts = [] as BittrexAlert[]

  static getId() {
    if (BittrexAlert.alerts.length === 0) return '0'
    return ((+BittrexAlert.alerts[BittrexAlert.alerts.length - 1]._id) + 1).toString()
  }

  constructor(public _id = BittrexAlert.getId(), public chatId, public key: string, public formula: { operation: string, num: number }, public des: string) {

  }

  static async remove(id) {
    if (!id) return
    const remove = (id) => {
      let idx = BittrexAlert.alerts.findIndex(e => e._id === id)
      BittrexAlert.alerts.splice(idx, 1)
    }
    if (id instanceof Array) {
      for (let e of id) {
        await remove(e._id)
      }
    } else {
      remove(id)
    }
    await BittrexAlert.save()
  }

  static async add(_id, chatId, key, formula, des) {
    const b = new BittrexAlert(_id, chatId, key, formula, des)
    BittrexAlert.alerts.push(b)
    await BittrexAlert.save()
    return b
  }

  static async init() {
    let ws = await BittrexAlert.redis.get(`bittrex.alerts`)
    if (ws) {
      ws = JSON.parse(ws)
      for (let k in ws) {
        const { chatId, key, formula, des, _id } = ws[k]
        await BittrexAlert.add(_id, chatId, key, formula, des)
      }
    }
    Redis.subscribe('updateData', async (data) => {
      const { tradings } = JSON.parse(data)
      if (BittrexAlert.alerts.length > 0) await BittrexAlert.check(tradings)
    }, AppConfig.redis)
  }

  static async save() {
    await BittrexAlert.redis.set(`bittrex.alerts`, JSON.stringify(BittrexAlert.alerts))
  }

  static async check(tradings: TradingTemp[]) {
    const alerts = BittrexAlert.alerts
    for (let i = alerts.length - 1; i >= 0; i--) {
      const alert = alerts[i]
      const t = tradings.find(e => e.key === alert.key)
      if (t) {
        const $ = t.last
        if ($) {
          let isok
          try {
            eval(`isok = $ ${alert.formula.operation} ${alert.formula.num}`)
            if (isok) {
              const msgs = [`🎉🎉🎉 [${alert.key}](https://bittrex.com/Market/Index?MarketName=${alert.key}) = *${BittrexApi.formatNumber(t.last)}* ${alert.formula.operation} ${BittrexApi.formatNumber(alert.formula.num)} 🎉🎉🎉`]
              if (alert.des) msgs.push(`_${alert.des}_`)
              await BittrexVNBot.Bot.send(alert.chatId, `${msgs.join('\n')}`, { parse_mode: 'Markdown' })
              await BittrexAlert.remove(alert._id)
            }
          } catch (_e) {
            await BittrexVNBot.Bot.send(alert.chatId, `Formula *${alert.formula.operation} ${BittrexApi.formatNumber(alert.formula.num)}* got problem`, { parse_mode: 'Markdown' })
          }
        }
      }
    }
  }
}