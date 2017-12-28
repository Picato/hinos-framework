import * as _ from 'lodash'
import { TrendingMessage } from './TrendingMessage';

export class MatrixTrends {
  // var a = [1, 2, 3, 4, 5, 6, 7, 8, 3, 4]
  // var s = [3, 4, 5]
  static calculate(s, a, buf) {
    let rs
    for (let i = 0, len = a.length; i < len; i++) {
      const vl = a[i]
      if (vl >= s[0] - buf && vl <= s[0] + buf) {
        var si = 1
        var sa = i + 1
        if (!rs) rs = {}
        rs[`${a[i - 1]}`] = 1
        while (si < s.length) {
          if (a[sa] >= s[si] - buf && a[sa] <= s[si] + buf) {
            rs[`${a[i - 1]}`]++
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

  static async callTrends(seriesPercent: number[], matrix: any[], rate: number) {
    const r = MatrixTrends.calculate(seriesPercent, matrix, rate)
    if (r) {
      const msgs = []
      msgs.push(`Dự báo sắp tới`)
      for (let k in r) {
        msgs.push(` - ${k}: ${r[k]} points`)
      }
      return msgs.join('\n')
    }
    return undefined
  }

  static async trends(data: any[], matrix: any[], rate: number) {
    let key
    let rs = {} as any
    for (let i = 0; i < data.length; i++) {
      const e = data[i]
      if (key !== e.key) {
        if (rs[key]) {
          const msg = await MatrixTrends.callTrends(rs[key].histories.map(e => e.percent), matrix, rate)
          if (msg) {
            rs[key].note.push(msg)
            await TrendingMessage.add({ msg, time: new Date(), type: 0, matcher: 'MATRIX', date: new Date().toDateString() })
          }
          rs[key].isMatrix = true
        }
        key = e.key
        rs[key] = {
          _id: e._id,
          name: e.name,
          market: e.market,
          time: e.time,
          score: 0,
          percent: 0,
          histories: [],
          note: []
        }
      }
      if (!rs[key].isMatrix) {
        const msg = await MatrixTrends.callTrends(rs[key].histories.map(e => e.percent), matrix, rate)
        if (msg) {
          rs[key].note.push(msg)
          await TrendingMessage.add({ msg, time: new Date(), type: 0, matcher: 'MATRIX', date: new Date().toDateString() })
        }
        rs[key].isMatrix = true
      }
      rs[key].last = e.last
      rs[key].score += i + 1 + ((i + 1) * e.percent)
      rs[key].percent += e.percent
      rs[key].histories.splice(0, 0, _.pick(e, ['last', 'time', 'percent']))

      if (i === data.length - 1) {
        if (e.percent >= 55) {
          rs[key].note.push(`#${rs[key].key} Sắp tới có thể sẽ tăng`)
          await TrendingMessage.add({ name: rs[key].name, market: rs[key].market, key: rs[key].key, msg: `Sắp tới có thể sẽ tăng`, type: 1, matcher: '55%', time: new Date(), date: new Date().toDateString() })
        } else if (e.percent <= -55) {
          rs[key].note.push(`#${rs[key].key} Sắp tới có thể sẽ giảm`)
          await TrendingMessage.add({ msg: `Sắp tới có thể sẽ giảm`, type: -1, matcher: '55%', time: new Date(), date: new Date().toDateString() })
        }
      }
    }
    const out = []
    for (let k in rs) {
      out.push(rs[k])
    }
    out.sort((a, b) => b.percent - a.percent)
    return out
  }

  static async loadInMatrix(data) {
    let key
    let matrix = []
    let line = []
    data.forEach((e) => {
      if (!key || key !== e.key) {
        if (line.length > 0) matrix.push(line)
        line = []
        key = e.key
      }
      line.push(e.percent)
    })
    if (line.length > 0) matrix.push(line)
    return matrix
  }
}
