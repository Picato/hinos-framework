import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { TradingTemp } from './RawHandler'
import TrendsHour from "../AI/TrendsHour";
// import { MatrixTrends } from './MatrixTrends'

@Collection('TradingHour1')
export class TradingHour1 {
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
  open: number
  prev: number
  candleLast: number
  candlePrev: number
  candlePercent: number
  last: number
  percent: number
  baseVolume: number
  baseVolumePercent: number
  low: number
  high: number
}

export default class HandlerHour1 {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  // static trending
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async find(fil) {
    return await HandlerHour1.mongo.find<TradingHour1>(TradingHour1, fil)
  }

  static async init() {
    console.log('#HandlerHour1', 'Initial')
    HandlerHour1.lastUpdateDB = await HandlerHour1.redis.get('HandlerHour1.lastUpdateDB')
    if (HandlerHour1.lastUpdateDB) HandlerHour1.lastUpdateDB = new Date(HandlerHour1.lastUpdateDB)
    // await HandlerHour1.loadInMatrix()
    // await HandlerHour1.trends()
  }

  static async loadInMatrix() {
    console.log('#HandlerHour1', 'Load matrix')
    // const data = await HandlerHour1.mongo.find<TradingHour1>(TradingHour1, {
    //   $recordsPerPage: 0,
    //   $fields: { _id: 1, percent: 1, key: 1 },
    //   $sort: {
    //     key: 1,
    //     time: 1
    //   }
    // })
    // HandlerHour1.matrix = await MatrixTrends.loadInMatrix(data)
  }

  static async getTradings() {
    return JSON.parse(await HandlerHour1.redis.get('HandlerHour1.newestTrading') || '[]')
  }

  static async insert(tradings: TradingTemp[], now: Date) {
    let caches = await HandlerHour1.redis.get('HandlerHour1.cached')
    if (caches) caches = JSON.parse(caches)
    else caches = {}
    if (!HandlerHour1.lastUpdateDB || (HandlerHour1.lastUpdateDB.getHours() !== now.getHours() && now.getHours() % 1 === 0)) {
      console.log('#HandlerHour1', 'Inserting trading')
      HandlerHour1.lastUpdateDB = now
      let data = []
      for (let e of tradings) {
        if (!caches[e.key]) caches[e.key] = {}
        let cached = caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

        const tr = {} as TradingHour1
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

        tr.low = tr.last > cached.low ? cached.low : tr.last
        tr.high = tr.last < cached.high ? cached.high : tr.last

        tr.open = cached.open !== undefined ? cached.open : tr.last
        tr.prev = cached.prev !== undefined ? cached.prev : tr.last
        tr.baseVolumePercent = cached.baseVolume !== undefined ? ((tr.baseVolume - cached.baseVolume) * 100 / cached.baseVolume) : 0

        tr.percent = (tr.last - tr.prev) * 100 / tr.prev

        tr.candleLast = tr.last - tr.open
        tr.candlePrev = cached.candlePrev !== undefined ? cached.candlePrev : (tr.last - tr.open)
        const candlePrev = tr.candlePrev * (tr.candlePrev < 0 ? -1 : 1)
        const candleLast = tr.candleLast * (tr.candleLast < 0 ? -1 : 1)
        tr.candlePercent = candleLast * 100 / (candlePrev || 1)
        data.push(tr)

        cached.open = undefined
        cached.low = undefined
        cached.high = undefined
        cached.prev = tr.last
        cached.candlePrev = tr.last - tr.open
        cached.baseVolume = tr.baseVolume
      }
      await HandlerHour1.mongo.insert<TradingHour1>(TradingHour1, data)
      await HandlerHour1.redis.set('HandlerHour1.lastUpdateDB', HandlerHour1.lastUpdateDB)
      await HandlerHour1.redis.set('HandlerHour1.newestTrading', JSON.stringify(data))
      TrendsHour.execute()
    } else {
      for (let e of tradings) {
        if (!caches[e.key]) caches[e.key] = {}
        let cached = caches[e.key]

        if (cached.open === undefined) cached.open = e.last

        if (cached.low === undefined) cached.low = e.last
        else cached.low = e.last > cached.low ? cached.low : e.last

        if (cached.high === undefined) cached.high = e.last
        else cached.high = e.last < cached.high ? cached.high : e.last
      }
    }
    await HandlerHour1.redis.set('HandlerHour1.cached', JSON.stringify(caches))
  }
}
