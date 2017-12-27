import * as _ from 'lodash'
import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo";
import { Redis, REDIS } from "hinos-redis/lib/redis";
import { BittrexCachedTrading } from './StoreTrading';
import { MatrixTrends } from './MatrixTrends';

@Collection('BittrexHourTrading')
export class BittrexHourTrading {
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

export default class StoreHour {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  static trending
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async init() {
    console.log('#StoreHour', 'Initial')
    StoreHour.lastUpdateDB = await StoreHour.redis.get('bittrex.lastUpdateHourDB')
    if (StoreHour.lastUpdateDB) StoreHour.lastUpdateDB = new Date(StoreHour.lastUpdateDB)
    await StoreHour.loadInMatrix()
    await StoreHour.trends()
  }

  static async loadInMatrix() {
    console.log('#StoreHour', 'Load matrix')
    const data = await StoreHour.mongo.find<BittrexHourTrading>(BittrexHourTrading, {
      $recordsPerPage: 0,
      $fields: { _id: 1, percent: 1, key: 1 },
      $sort: {
        key: 1,
        time: 1
      }
    })
    StoreHour.matrix = await MatrixTrends.loadInMatrix(data)
  }

  static async insert(tradings: BittrexCachedTrading[], now: Date) {
    if (!StoreHour.lastUpdateDB || (StoreHour.lastUpdateDB.getHours() !== now.getHours())) { //&& now.getMinutes() % AppConfig.app.bittrex.updateDBAfterMins === 0
      console.log('#StoreHour', 'Inserting trading')
      let data = []
      for (let e of tradings) {
        let prev = await StoreHour.redis.hget('bittrex.prev.hour', e.key)
        if (prev) {
          e.prev = JSON.parse(prev)
        }
        e['date'] = e.time.getDate()
        e['month'] = e.time.getMonth()
        e['year'] = e.time.getFullYear()
        e['hours'] = e.time.getHours()
        e.percent = (e.last.usdt - e.prev.usdt) * 100 / e.prev.usdt
        data.push(_.omit(e, ['low', 'high', 'baseVolume', 'volume', 'bid', 'ask']) as BittrexHourTrading)
      }
      await StoreHour.redis.hset('bittrex.prev.hour', (() => {
        let rs = {}
        data.forEach(e => {
          rs[e.key] = JSON.stringify(e.last)
        })
        return rs
      })())
      await StoreHour.mongo.insert<BittrexHourTrading>(BittrexHourTrading, data)
      StoreHour.lastUpdateDB = now
      await StoreHour.redis.set('bittrex.lastUpdateHourDB', StoreHour.lastUpdateDB)
      await StoreHour.trends()
    }
  }

  static async trends() {
    console.log('#StoreHour', 'Calculate simple trends')
    let beforeThat = new Date()
    beforeThat.setHours(beforeThat.getHours() - 5)
    const data = await StoreHour.mongo.find<BittrexHourTrading>(BittrexHourTrading, {
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
    StoreHour.trending = MatrixTrends.trends(data, StoreHour.matrix, 0.1)
  }
}
