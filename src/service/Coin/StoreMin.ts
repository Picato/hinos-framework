import * as _ from 'lodash'
import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'

@Collection('BittrexMinTrading')
export class BittrexMinTrading {
  _id?: Uuid
  name: string
  market: string
  key: string
  raw_time: Date
  time: Date
  date: number
  month: number
  year: number
  hours: number
  minutes: number
  prev: {
    usdt: number
    btc: number
    eth: number
  }
  last: {
    usdt: number
    btc: number
    eth: number
  }
  percent: number
  bid: {
    usdt: number
    btc: number
    eth: number
  }
  ask: {
    usdt: number
    btc: number
    eth: number
  }
}

export default class StoreMin {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  static trendsMin

  private static lastUpdateDB

  static async init() {
    StoreMin.lastUpdateDB = await StoreMin.redis.get('bittrex.lastUpdateMinDB')
    if (StoreMin.lastUpdateDB) StoreMin.lastUpdateDB = new Date(StoreMin.lastUpdateDB)
  }

  static async insert(tradings: BittrexCachedTrading[], now: Date) {
    if (!StoreMin.lastUpdateDB || (StoreMin.lastUpdateDB.getMinutes() !== now.getMinutes() && now.getMinutes() % AppConfig.app.bittrex.updateDBAfterMins === 0)) {
      let data = []
      for (let e of tradings) {
        let prev = await StoreMin.redis.hget('bittrex.prev.min', e.key)
        if (prev) {
          e.prev = JSON.parse(prev)
        }
        e['date'] = e.time.getDate()
        e['month'] = e.time.getMonth()
        e['year'] = e.time.getFullYear()
        e['hours'] = e.time.getHours()
        e['minutes'] = e.time.getMinutes()
        e.percent = (e.last.usdt - e.prev.usdt) * 100 / e.prev.usdt
        data.push(_.omit(e, ['low', 'high', 'baseVolume', 'volume']) as BittrexMinTrading)
      }
      await StoreMin.redis.hset('bittrex.prev.min', (() => {
        let rs = {}
        data.forEach(e => {
          rs[e.key] = JSON.stringify(e.last)
        })
        return rs
      })())
      await StoreMin.mongo.insert<BittrexMinTrading>(BittrexMinTrading, data)
      StoreMin.lastUpdateDB = now
      await StoreMin.redis.set('bittrex.lastUpdateMinDB', StoreMin.lastUpdateDB)
      await StoreMin.trends()
    }
  }

  static async trends() {
    let beforeThat = new Date()
    beforeThat.setMinutes(beforeThat.getMinutes() - 30)
    const data = await StoreMin.mongo.find<BittrexMinTrading>(BittrexMinTrading, {
      $where: {
        time: {
          $gte: beforeThat
        }
      },
      $recordsPerPage: 0,
      $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1 },
      $sort: {
        key: 1,
        time: 1
      }
    })
    let key
    let rs = {} as any
    data.forEach((e, i) => {
      if (key !== e.key) {
        key = e.key
        rs[key] = {
          _id: e._id,
          name: e.name,
          market: e.market,
          score: 0,
          percent: 0,
          histories: []
        }
      }
      rs[key].last = e.last
      rs[key].score += i + 1 + ((i + 1) * e.percent)
      rs[key].percent += e.percent
      rs[key].histories.splice(0, 0, e)
    })
    const out = []
    for (let k in rs) {
      out.push(rs[k])
    }
    out.sort((a, b) => b.percent - a.percent)
    StoreMin.trendsMin = out
  }
}
