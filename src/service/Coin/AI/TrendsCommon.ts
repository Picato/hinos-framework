import { Uuid } from "hinos-mongo/lib/mongo"
import BittrexApi from "../Bittrex/BittrexApi"

export class BittrexTrading {
  _id?: Uuid
  key: string
  time: Date
  prev: number
  last: number
  num: number // last-prev
  percent: number
  baseVolume: number
  prevBaseVolume: number
  baseVolumeNum: number
  baseVolumePercent: number
  candlePercent: number
  candlePrev: number
  candleLast: number
}

export class TrendsCommon {

  // public async execute(tradings: { [key: string]: BittrexTrading[] }) {
  //   for (let key in tradings) {
  //     const items = tradings[key]

  //     let msgs = await Promise.all([
  //       this.check55Percent(key, items[0]),
  //       this.checkRecentlySame(key, items),
  //       this.checkBaseVolume(key, items)
  //     ]) as any[]

  //     msgs = msgs.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), [])
  //     if (msgs.length > 0) {
  //       await TrendsMessageService.insert(msgs, this.keyMessage)
  //     }
  //   }
  // }

  checkBaseVolume(key, tradings: BittrexTrading[]) {
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

  checkRecentlySame(key, tradings: BittrexTrading[]) {
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

  check55Percent(key: string, item: BittrexTrading) {
    return new Promise((resolve) => {
      const Percent = 55
      const msgs = []
      if (item.candlePercent >= Percent) {
        if (item.candlePrev > 0 && item.candleLast < 0) {
          // Dang giam
          msgs.push({ key, txt: `Thị trường đảo chiều đang giảm ${BittrexApi.formatNumber(item.candlePercent)}%` })
        } else if (item.candlePrev < 0 && item.candleLast > 0) {
          // Dang tang
          msgs.push({ key, txt: `Thị trường đảo chiều đang tăng ${BittrexApi.formatNumber(item.candlePercent)}%` })
        } else if (item.candlePrev < 0 && item.candleLast < 0) {
          // Trends giam
          msgs.push({ key, txt: `Có thể trends giảm (${BittrexApi.formatNumber(item.candlePercent)}%)` })
        } else {
          // Trends tang
          msgs.push({ key, txt: `Có thể trends tăng (${BittrexApi.formatNumber(item.candlePercent)}%)` })
        }
      }
      resolve(msgs)
    })
  }
}