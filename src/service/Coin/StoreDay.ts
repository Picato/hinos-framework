import * as _ from 'lodash'
import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'
import { MatrixTrends } from './MatrixTrends';

@Collection('BittrexDayTrading')
export class BittrexDayTrading {
  _id?: Uuid
  name: string
  market: string
  key: string
  raw_time: Date
  time: Date
  date: number
  month: number
  year: number
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

export default class StoreDay {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  static trending
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async init() {
    console.log('#StoreDay', 'Initial')
    StoreDay.lastUpdateDB = await StoreDay.redis.get('bittrex.lastUpdateDayDB')
    if (StoreDay.lastUpdateDB) StoreDay.lastUpdateDB = new Date(StoreDay.lastUpdateDB)
    await StoreDay.loadInMatrix()
    await StoreDay.trends()
  }

  static async loadInMatrix() {
    console.log('#StoreDay', 'Load matrix')
    const data = await StoreDay.mongo.find<BittrexDayTrading>(BittrexDayTrading, {
      $recordsPerPage: 0,
      $fields: { _id: 1, percent: 1, key: 1 },
      $sort: {
        key: 1,
        time: 1
      }
    })
    StoreDay.matrix = await MatrixTrends.loadInMatrix(data)
  }

  static async insert(tradings: BittrexCachedTrading[], now: Date) {    
    if (!StoreDay.lastUpdateDB || (StoreDay.lastUpdateDB.getDate() !== now.getDate())) { //&& now.getMinutes() % AppConfig.app.bittrex.updateDBAfterMins === 0
      console.log('#StoreDay', 'Insert trading')
      let data = []
      for (let e of tradings) {
        let prev = await StoreDay.redis.hget('bittrex.prev.day', e.key)
        if (prev) {
          e.prev = JSON.parse(prev)
        }
        e['date'] = e.time.getDate()
        e['month'] = e.time.getMonth()
        e['year'] = e.time.getFullYear()
        e.percent = (e.last.usdt - e.prev.usdt) * 100 / e.prev.usdt
        data.push(_.omit(e, ['low', 'high', 'baseVolume', 'volume', 'bid', 'ask']) as BittrexDayTrading)
      }
      await StoreDay.redis.hset('bittrex.prev.day', (() => {
        let rs = {}
        data.forEach(e => {
          rs[e.key] = JSON.stringify(e.last)
        })
        return rs
      })())
      await StoreDay.mongo.insert<BittrexDayTrading>(BittrexDayTrading, data)
      StoreDay.lastUpdateDB = now
      await StoreDay.redis.set('bittrex.lastUpdateDayDB', StoreDay.lastUpdateDB)
      await StoreDay.trends()
    }
  }

  static matrixTrends(seriesPercent, allcase): string[] {
    const rs = MatrixTrends.calculate(seriesPercent, allcase, 0.5)
    if (!rs) return rs
    Object.keys(rs).map(e => {
      return { target: e, percent: rs[e] }
    }).sort((a, b) => b.percent - a.percent).slice(0, 10).map(e => `${e.target}: ${e.percent}%`)
  }

  static async trends() {
    console.log('#StoreDay', 'Calculate simple trends')
    let beforeThat = new Date()
    beforeThat.setDate(beforeThat.getDate() - 5)
    const data = await StoreDay.mongo.find<BittrexDayTrading>(BittrexDayTrading, {
      $where: {
        time: {
          $gte: beforeThat
        }
      },
      $recordsPerPage: 0,
      $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1 },
      $sort: {
        key: 1,
        time: 1
      }
    })
    StoreDay.trending = MatrixTrends.trends(data, StoreDay.matrix, 0.1)
  }
}
