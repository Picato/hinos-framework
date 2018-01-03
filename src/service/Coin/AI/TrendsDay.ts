import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { BittrexDayTrading } from "../StoreDay";
import { TrendsMessageService } from "./TrendsMessage";

export default class TrendsDay {
  @MONGO('coin')
  private static mongo: Mongo

  static tradings = {} as {
    [key: string]: any[]
  }

  static async execute() {
    let beforeThat = new Date()
    beforeThat.setDate(beforeThat.getDate() - 30)
    const data = await TrendsDay.mongo.find<BittrexDayTrading>(BittrexDayTrading, {
      $where: {
        time: {
          $gte: beforeThat
        }
      },
      $recordsPerPage: 0,
      $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1, prev: 1, candlePrev: 1, candlePercent: 1, candleLast: 1 },
      $sort: {
        key: 1,
        time: -1
      }
    })
    data.forEach(e => {
      if (!TrendsDay.tradings[e.key]) TrendsDay.tradings[e.key] = []
      TrendsDay.tradings[e.key].push(e)
    })
    for (let key in TrendsDay.tradings) {
      const tradings = TrendsDay.tradings[key]
      let msgs = await Promise.all([
        TrendsDay.check55Percent(key, tradings[0]),
        TrendsDay.checkRecentlySame(key, tradings)
      ]) as any[]
      msgs = msgs.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), [])
      if (msgs.length > 0) {
        await TrendsMessageService.insert(msgs, 'day')
      }
    }
  }

  static checkRecentlySame(key, tradings: BittrexDayTrading[]) {
    return new Promise((resolve) => {
      const msgs = []
      const Step = 10
      let c = 0
      for (let t of tradings) {
        if (t.candlePercent < 50)
          c++
        else
          break
      }
      if (c >= Step) {
        msgs.push({ key, txt: `Thị trường đã lâu không biến động trong ${c} candle` })
      }
      resolve(msgs)
    })
  }

  static check55Percent(key: string, item: BittrexDayTrading) {
    return new Promise((resolve) => {
      const Percent = 55
      const msgs = []
      if (item.candlePercent >= Percent) {
        if (item.candlePrev > 0 && item.candleLast < 0) {
          // Dang giam
          msgs.push({ key, txt: `Thị trường đảo chiều đang giảm ${item.candlePercent}%` })
        } else if (item.candlePrev < 0 && item.candleLast > 0) {
          // Dang tang
          msgs.push({ key, txt: `Thị trường đảo chiều đang tăng ${item.candlePercent}%` })
        } else if (item.candlePrev < 0 && item.candleLast < 0) {
          // Trends giam
          msgs.push({ key, txt: `Có thể trends giảm (${item.candlePercent}%)` })
        } else {
          // Trends tang
          msgs.push({ key, txt: `Có thể trends tăng (${item.candlePercent}%)` })
        }
      }
      resolve(msgs)
    })
  }
}