import { Uuid } from "hinos-mongo/lib/mongo"
import BittrexApi from "../Bittrex/BittrexApi"
import { TradingMin } from "../Crawler/AbsHandlerMin";
// import { Redis, REDIS } from "hinos-redis/lib/redis";

// const RATE_CANDLE_PERCENT = 0.5
const RATE_PERCENT = 0.8

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

  // @REDIS()
  // redis: Redis

  matrix = {} as {
    [key: string]: {
      percent: number[]
      // candlePercent: number[]
    }
  }

  async loadMatrixIntoCached(_tblName: string, tradings: TradingMin[]) {
    // await this.redis.lpush(`matrix.${tblName}#percent`, tradings.map(e => e.percent.toString()))
    // await this.redis.lpush(`matrix.${tblName}#candlePercent`, tradings.map(e => e.candlePercent.toString()))
    let key
    const self = this
    let line = {
      percent: [],
      candlePercent: []
    }
    tradings.forEach((e) => {
      if (!key || key !== e.key) {
        if (line.percent.length > 0) {
          if (!self.matrix[key]) {
            self.matrix[key] = {
              percent: [],
              // candlePercent: []
            }
          }
          self.matrix[key].percent = self.matrix[key].percent.concat(line.percent)
        }
        line.percent = []
        key = e.key
      }
      line.percent.push(+e.percent.toFixed(8))
    })
    if (line.percent.length > 0) {
      if (!self.matrix[key]) {
        self.matrix[key] = {
          percent: [],
          // candlePercent: []
        }
      }
      self.matrix[key].percent = self.matrix[key].percent.concat(line.percent)
    }
    // await this.redis.del(`matrix.${tblName}`)
    // await this.redis.hset(`matrix.${tblName}`, {

    // })
  }

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

  private calculate(s, a, buf, rs) {
    for (let i = 1, len = a.length; i < len; i++) {
      const vl = a[i]
      if (vl >= s[0] - buf && vl <= s[0] + buf) {
        if (!a[i - 1] && i > 0) return rs
        var si = 1
        var sa = i + 1
        let same = rs.find(e => e.value === a[i - 1])
        if (!same) {
          rs.push({ value: a[i - 1], weight: 1 })
          same = rs.find(e => e.value === a[i - 1])
        }
        while (si < s.length) {
          if (a[sa] >= s[si] - buf && a[sa] <= s[si] + buf) {
            same.weight++
            sa++
            si++
          } else {
            sa++
            si++
            break
          }
        }
      }
    }
    return rs
  }

  // private async callTrends(seriesPercent: number[], matrix: any[], rate: number) {
  //   const r = this.calculate(seriesPercent, matrix, rate)
  //   if (r) {
  //     const msgs = []
  //     msgs.push(`Dự báo sắp tới`)
  //     for (let k in r) {
  //       msgs.push(` - Tỉ lệ tăng/giảm ${k}% ~ ${r[k]} points`)
  //     }
  //     return msgs.join('\n')
  //   }
  //   return undefined
  // }

  // private async trends(key, msgs, data: any[], matrix: any[], rate: number) {
  //   let key
  //   let rs = {} as any
  //   for (let i = 0; i < data.length; i++) {
  //     const e = data[i]
  //     if (key !== e.key) {
  //       if (rs[key]) {
  //         const msg = await this.callTrends(rs[key].histories.map(e => e.percent), matrix, rate)
  //         if (msg) {
  //           rs[key].note.push(msg)
  //           await msgs.push({ key, market: key.split('-')[0], time: new Date(), type: 0, matcher: 'MATRIX', date: new Date().toDateString() })
  //         }
  //         rs[key].isMatrix = true
  //       }
  //       key = e.key
  //       rs[key] = {
  //         _id: e._id,
  //         name: e.name,
  //         market: e.market,
  //         time: e.time,
  //         score: 0,
  //         percent: 0,
  //         histories: [],
  //         note: []
  //       }
  //     }
  //     if (!rs[key].isMatrix) {
  //       const msg = await MatrixTrends.callTrends(rs[key].histories.map(e => e.percent), matrix, rate)
  //       if (msg) {
  //         rs[key].note.push(msg)
  //         await TrendingMessage.add({ msg, key, market: key.split('-')[0], time: new Date(), type: 0, matcher: 'MATRIX', date: new Date().toDateString() })
  //       }
  //       rs[key].isMatrix = true
  //     }
  //     rs[key].last = e.last
  //     rs[key].score += i + 1 + ((i + 1) * e.percent)
  //     rs[key].percent += e.percent
  //     rs[key].histories.splice(0, 0, _.pick(e, ['last', 'time', 'percent']))

  //     if (i === data.length - 1) {
  //       if (e.percent >= 55) {
  //         rs[key].note.push(`#${rs[key].key} Sắp tới có thể sẽ tăng`)
  //         await TrendingMessage.add({ key: rs[key].key, market: rs[key].market, msg: `Sắp tới có thể sẽ tăng`, type: 1, matcher: '55%', time: new Date(), date: new Date().toDateString() })
  //       } else if (e.percent <= -55) {
  //         rs[key].note.push(`#${rs[key].key} Sắp tới có thể sẽ giảm`)
  //         await TrendingMessage.add({ key: rs[key].key, market: rs[key].market, msg: `Sắp tới có thể sẽ giảm`, type: -1, matcher: '55%', time: new Date(), date: new Date().toDateString() })
  //       }
  //     }
  //   }
  //   const out = []
  //   for (let k in rs) {
  //     out.push(rs[k])
  //   }
  //   out.sort((a, b) => b.percent - a.percent)
  //   return out
  // }

  async checkMatrix(key, tradings: BittrexTrading[], _tblName: string) {
    let msgs = []

    if (!this.matrix[key]) this.matrix[key] = {
      percent: [],
      // candlePercent: []
    }

    this.matrix[key].percent.splice(0, 0, tradings[0].percent)
    // this.matrix[key].candlePercent.splice(0, 0, tradings[0].candlePercent)
    // await this.redis.hset(`matrix.${tblName}`, {
    //   percent: JSON.stringify(self.matrix.percent),
    //   candlePercent: JSON.stringify(self.matrix.candlePercent),
    // })
    // }

    const data = {
      percent: tradings.map(e => e.percent),
      candlePercent: tradings.map(e => e.candlePercent)
    }
    let rsPercent = []
    let rsCandlePercent = []
    for (let key in this.matrix) {
      const marketPercents = this.matrix[key]
      rsPercent = this.calculate(data.percent, marketPercents.percent, RATE_PERCENT, rsPercent)
      // rsCandlePercent = this.calculate(data.candlePercent, marketPercents.candlePercent, RATE_CANDLE_PERCENT, rsCandlePercent)
    }
    rsPercent = rsPercent.filter(e => e.weight > 5).sort((a, b) => b.weight - a.weight).slice(0, 5)
    rsCandlePercent = rsPercent.filter(e => e.weight > 5).sort((a, b) => b.weight - a.weight).slice(0, 5)
    const last = tradings[0].last
    msgs = msgs.concat(rsPercent.map(e => {
      return { key, txt: `[Tỉ lệ (price) ${e.weight}] Giá dự đoán ${BittrexApi.formatNumber(+last + (+last * +e.value))} (${BittrexApi.formatNumber(e.value)}%)`, style: 'MATRIX' }
    }))
    msgs = msgs.concat(rsCandlePercent.map(e => {
      return { key, txt: `[Tỉ lệ (candle) ${e.weight}] Giá dự đoán ${BittrexApi.formatNumber(+last + (+last * +e.value))} (${BittrexApi.formatNumber(e.value)}%)`, style: 'MATRIX' }
    }))
    return msgs
  }

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
          msgs.push({ key, txt: `[${c} lần liên tiếp] Thị trường đang được đổ tiền vào`, style: 'VOLUME' })
        } else {
          msgs.push({ key, txt: `[${c} lần liên tiếp] Thị trường đang bị rút tiền ra`, style: 'VOLUME' })
        }
      }
      if (tradings[0] && tradings[0].baseVolumePercent >= 50) {
        if (sign > 0) {
          msgs.push({ key, txt: `[${tradings[0].baseVolumePercent}%] Thị trường đang được đổ tiền MẠNH`, style: 'VOLUME' })
        } else {
          msgs.push({ key, txt: `[${tradings[0].baseVolumePercent}%] Thị trường đang bị rút tiền MẠNH`, style: 'VOLUME' })
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