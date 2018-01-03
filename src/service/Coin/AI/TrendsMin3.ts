import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { TrendsMessageService } from "./TrendsMessage";
import { TradingMin } from "../Crawler/AbsHandlerMin";

export default class TrendsMin3 {
  @MONGO('coin')
  private static mongo: Mongo

  static tradings = {} as {
    [key: string]: any[]
  }

  static async execute() {
    let beforeThat = new Date()
    beforeThat.setMinutes(beforeThat.getMinutes() - 30)
    const data = await TrendsMin3.mongo.find<TradingMin>('TradingMin3', {
      $where: {
        time: {
          $gte: beforeThat
        }
      },
      $recordsPerPage: 0,
      $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1, prev: 1, candlePrev: 1, candlePercent: 1, candleLast: 1, baseVolumePercent: 1 },
      $sort: {
        key: 1,
        time: -1
      }
    })
    data.forEach(e => {
      if (!TrendsMin3.tradings[e.key]) TrendsMin3.tradings[e.key] = []
      TrendsMin3.tradings[e.key].push(e)
    })
    for (let key in TrendsMin3.tradings) {
      const tradings = TrendsMin3.tradings[key]
      let msgs = await Promise.all([
        TrendsMin3.check55Percent(key, tradings[0]),
        TrendsMin3.checkRecentlySame(key, tradings),
        TrendsMin3.checkBaseVolume(key, tradings)
      ]) as any[]
      msgs = msgs.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), [])
      if (msgs.length > 0) {
        await TrendsMessageService.insert(msgs, 'min3')
      }
    }
  }

  static checkBaseVolume(key, tradings: TradingMin[]) {
    return new Promise((resolve) => {
      let sign
      let c = 0
      const msgs = []
      for (let t of tradings) {
        if (!sign) {
          sign = t.baseVolumePercent >= 0 ? 1 : -1
        } else if (sign > 0 && t.baseVolumePercent > 0) {
          c++
        } else if (sign < 0 && t.baseVolumePercent < 0) {
          c++
        } else {
          break
        }
      }
      if (c >= 2) {
        if (sign > 0) {
          msgs.push({ key, txt: `Thị trường đang được đổ tiền vào ${c} lần liên tiếp`, style: 'VOLUME' })
        } else {
          msgs.push({ key, txt: `Thị trường đang bị rút tiền ra ${c} lần liên tiếp`, style: 'VOLUME' })
        }
      }
      resolve(msgs)
    })
  }

  static checkRecentlySame(key, tradings: TradingMin[]) {
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

  static check55Percent(key: string, item: TradingMin) {
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