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
  prev: number
  last: number
  percent: number
  baseVolume: number
  baseVolumePercent: number
  low: number
  high: number
}

export default class StoreHour {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  static trending
  static newestTrading = []
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async init() {
    console.log('#StoreHour', 'Initial')
    StoreHour.lastUpdateDB = await StoreHour.redis.get('StoreHour.lastUpdateDB')
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
        const tr = {} as BittrexHourTrading
        tr._id = e._id
        tr.key = e.key
        tr.name = e.name
        tr.market = e.market
        tr.raw_time = e.raw_time
        tr.time = e.time
        tr.date = e.time.getDate()
        tr.month = e.time.getMonth()
        tr.year = e.time.getFullYear()
        tr.hours = e.time.getHours()
        tr.baseVolume = e.baseVolume
        tr.last = e.last
        let prev = await StoreHour.redis.hget('StoreHour.prevCached', e.key)
        if (prev) {
          prev = JSON.parse(prev)
          tr.prev = prev.last
          tr.low = tr.last < prev.low ? tr.last : prev.low
          tr.high = tr.last > prev.high ? tr.last : prev.high
          tr.baseVolumePercent = (tr.baseVolume - prev.baseVolume) * 100 / prev.baseVolume
        } else {
          tr.prev = tr.last
          tr.low = tr.high = tr.last
          tr.baseVolumePercent = 0
        }
        tr.percent = (tr.last - tr.prev) * 100 / tr.prev
        data.push(tr)
      }
      await StoreHour.redis.hset('StoreHour.prevCached', (() => {
        let rs = {}
        data.forEach(e => {
          rs[e.key] = JSON.stringify({ last: e.last, low: e.low, high: e.high, baseVolume: e.baseVolume })
        })
        return rs
      })())
      await StoreHour.mongo.insert<BittrexHourTrading>(BittrexHourTrading, data)
      StoreHour.lastUpdateDB = now
      await StoreHour.redis.set('StoreHour.lastUpdateDB', StoreHour.lastUpdateDB)
      await StoreHour.trends()
      StoreHour.newestTrading = data
      return true
    }
    return false
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
        time: -1
      }
    })
    StoreHour.trending = MatrixTrends.trends(data, StoreHour.matrix, 0.1)
  }
}
