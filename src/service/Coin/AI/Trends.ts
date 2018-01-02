import { REDIS, Redis } from "hinos-redis/lib/redis";
import { MONGO, Mongo } from "hinos-mongo/lib/mongo";
import { BittrexMin5Trading } from "../StoreMin5";


export default class Trends {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  static async getTrendNewsOnDay() {
    return JSON.parse((await Trends.redis.get('Trends.newsOnDay')) || '[]')
  }
  static async getTrendNewsInHour() {
    return JSON.parse((await Trends.redis.get('Trends.newsInHour')) || '[]')
  }
  static async getTrendNewsInMinute() {
    return JSON.parse((await Trends.redis.get('Trends.newsInMinute')) || '[]')
  }

  static async trendsMinutes() {
    let beforeThat = new Date()
    beforeThat.setMinutes(beforeThat.getMinutes() - 30)
    const data = await Trends.mongo.find<BittrexMin5Trading>(BittrexMin5Trading, {
      $where: {
        time: {
          $gte: beforeThat
        }
      },
      $recordsPerPage: 0,
      $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1, prev: 1 },
      $sort: {
        key: 1,
        time: -1
      }
    })
    const rs = {} as {
      [key: string]: any[]
    }
    data.forEach(e => {
      if (!rs[e.key]) rs[e.key] = []
      rs[e.key].push(e)
    })
    const msgs = await Trends.trendsUpDown(rs)
    await Trends.redis.set('Trends.newsInMinute', JSON.stringify(msgs))
  }

  static async trendsHours() {
    let beforeThat = new Date()
    beforeThat.setMinutes(beforeThat.getHours() - 12)
    const data = await Trends.mongo.find<BittrexMin5Trading>(BittrexMin5Trading, {
      $where: {
        time: {
          $gte: beforeThat
        }
      },
      $recordsPerPage: 0,
      $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1, prev: 1 },
      $sort: {
        key: 1,
        time: -1
      }
    })
    const rs = {} as {
      [key: string]: any[]
    }
    data.forEach(e => {
      if (!rs[e.key]) rs[e.key] = []
      rs[e.key].push(e)
    })
    const msgs = await Trends.trendsUpDown(rs)
    await Trends.redis.set('Trends.newsInHour', JSON.stringify(msgs))
  }

  static async trendsDays() {
    let beforeThat = new Date()
    beforeThat.setMinutes(beforeThat.getDate() - 7)
    const data = await Trends.mongo.find<BittrexMin5Trading>(BittrexMin5Trading, {
      $where: {
        time: {
          $gte: beforeThat
        }
      },
      $recordsPerPage: 0,
      $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1, prev: 1 },
      $sort: {
        key: 1,
        time: -1
      }
    })
    const rs = {} as {
      [key: string]: any[]
    }
    data.forEach(e => {
      if (!rs[e.key]) rs[e.key] = []
      rs[e.key].push(e)
    })
    const msgs = await Trends.trendsUpDown(rs)
    await Trends.redis.set('Trends.newsOnDay', JSON.stringify(msgs))
  }

  static async trendsUpDown(traddings: { [key: string]: any[] }) {
    const time = new Date()
    const msgs = [] as any
    for (let key in traddings) {
      let items = traddings[key]

      const last = items[0] as BittrexMin5Trading
      const open = items[items.length - 1] as BittrexMin5Trading

      const msg = {
        time,
        key,
        msgs: []
      } as any

      if (last.percent > 55) {
        msg.msgs.push({ txt: `Vua tang ${last.percent}%`, type: 1 })
      } else if (last.percent < -55) {
        msg.msgs.push({ txt: `Vua giam ${last.percent}%`, type: -1 })
      }

      const bufPercent = (last.last - open.last) * 100 / open.last
      if (bufPercent > 10) {
        msg.msgs.push({ txt: `Bien dong tang ${bufPercent}%`, type: 1 })
      } else if (bufPercent < -10) {
        msg.msgs.push({ txt: `Bien dong giam ${Math.abs(bufPercent)}%`, type: -1 })
      }

      if (items.length > 5) {
        let slient = true
        items.forEach(e => {
          if (e.percent > 5 || e.percent < -5) slient = false
        })
        if (slient) {
          msg.msgs.push({ txt: `Da lau ko co bien dong nhieu`, type: 0 })
        }
      }

      if (msg.msgs.length > 0) {
        msgs.push(msg)
      }

    }

    return msgs

  }
}