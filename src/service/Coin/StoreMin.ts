import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'
import Trends from "./AI/Trends";
// import { MatrixTrends } from './MatrixTrends'

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
  prev: number
  last: number
  percent: number
  baseVolume: number
  baseVolumePercent: number
  low: number
  high: number
}

export default class StoreMin {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  // static trending
  static newestTrading = []
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async init() {
    console.log('#StoreMin', 'Initial')
    StoreMin.lastUpdateDB = await StoreMin.redis.get('StoreMin.lastUpdateDB')
    if (StoreMin.lastUpdateDB) StoreMin.lastUpdateDB = new Date(StoreMin.lastUpdateDB)
    await StoreMin.loadInMatrix()
    await StoreMin.trends()
  }

  static async loadInMatrix() {
    console.log('#StoreMin', 'Load matrix')
    // const data = await StoreMin.mongo.find<BittrexMinTrading>(BittrexMinTrading, {
    //   $recordsPerPage: 0,
    //   $fields: { _id: 1, percent: 1, key: 1 },
    //   $sort: {
    //     key: 1,
    //     time: 1
    //   }
    // })
    // StoreMin.matrix = await MatrixTrends.loadInMatrix(data)
  }

  static async insert(tradings: BittrexCachedTrading[], now: Date) {
    if (!StoreMin.lastUpdateDB || (StoreMin.lastUpdateDB.getMinutes() !== now.getMinutes() && now.getMinutes() % AppConfig.app.bittrex.updateDBAfterMins === 0)) {
      console.log('#StoreMin', 'Inserting trading')
      let data = []
      for (let e of tradings) {
        const tr = {} as BittrexMinTrading
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
        tr.minutes = e.time.getMinutes()
        tr.baseVolume = e.baseVolume
        tr.last = e.last
        let prev = await StoreMin.redis.hget('StoreMin.prevCached', e.key)
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
      await StoreMin.redis.hset('StoreMin.prevCached', (() => {
        let rs = {}
        data.forEach(e => {
          rs[e.key] = JSON.stringify({ last: e.last, low: e.low, high: e.high, baseVolume: e.baseVolume })
        })
        return rs
      })())
      await StoreMin.mongo.insert<BittrexMinTrading>(BittrexMinTrading, data)
      StoreMin.lastUpdateDB = now
      await StoreMin.redis.set('StoreMin.lastUpdateDB', StoreMin.lastUpdateDB)
      await StoreMin.trends()
      StoreMin.newestTrading = data
      return true
    }
    return false
  }

  static async trends() {
    console.log('#StoreMin', 'Calculate simple trends')
    Trends.trendsMinutes()
    // let beforeThat = new Date()
    // beforeThat.setMinutes(beforeThat.getMinutes() - 30)
    // const data = await StoreMin.mongo.find<BittrexMinTrading>(BittrexMinTrading, {
    //   $where: {
    //     time: {
    //       $gte: beforeThat
    //     }
    //   },
    //   $recordsPerPage: 0,
    //   $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1, prev: 1 },
    //   $sort: {
    //     key: 1,
    //     time: -1
    //   }
    // })
    // const rs = {}
    // data.forEach(e => {
    //   if (!rs[e.key]) rs[e.key] = []
    //   rs[e.key].push(e)
    // })
    // await Trends(rs)
    // StoreMin.trending = MatrixTrends.trends(data, StoreMin.matrix, 0.1)
  }
}
