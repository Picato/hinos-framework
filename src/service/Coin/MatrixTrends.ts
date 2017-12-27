import * as _ from 'lodash'

export class MatrixTrends {
  // var a = [1, 2, 3, 4, 5, 6, 7, 8, 3, 4]
  // var s = [3, 4, 5]
  static calculate(s, a, buf) {
    let rs
    a.forEach((vl, i) => {
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
    })
    return rs
  }

  static trends(data: any[], matrix: any[], rate: number) {
    let key
    let rs = {} as any
    data.forEach((e, i) => {
      if (key !== e.key) {
        if (rs[key]) {
          const r = MatrixTrends.calculate(rs[key].histories.map(e => e.percent), matrix, rate)
          if (r) rs[key].note.push('Sap toi len ' + JSON.stringify(r))
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
        const r = MatrixTrends.calculate(rs[key].histories.map(e => e.percent), matrix, rate)
        if (r) rs[key].note.push('Sap toi len ' + JSON.stringify(r))
        rs[key].isMatrix = true
      }
      rs[key].last = e.last
      rs[key].score += i + 1 + ((i + 1) * e.percent)
      rs[key].percent += e.percent
      rs[key].histories.splice(0, 0, _.pick(e, ['last', 'time', 'percent']))

      if (i === data.length - 1) {
        if (e.percent >= 50) {
          rs[key].note.push(`Sắp tới có thể sẽ tăng`)
        } else if (e.percent <= -50) {
          rs[key].note.push(`Sắp tới có thể sẽ giảm`)
        }
      }
    })
    const out = []
    for (let k in rs) {
      out.push(rs[k])
    }
    out.sort((a, b) => b.percent - a.percent)
    return rs
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
