import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'
import TrendsMin3 from "./AI/TrendsMin3";
// import { MatrixTrends } from './MatrixTrends'

@Collection('BittrexMin3Trading')
export class BittrexMin3Trading {
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
  open: number
  prev: number
  candlePrev: number
  candlePercent: number
  last: number
  percent: number
  baseVolume: number
  baseVolumePercent: number
  low: number
  high: number
}

export default class StoreMin3 {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  // static trending
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async find(fil) {
    return await StoreMin3.mongo.find<BittrexMin3Trading>(BittrexMin3Trading, fil)
  }

  static async init() {
    console.log('#StoreMin3', 'Initial')
    StoreMin3.lastUpdateDB = await StoreMin3.redis.get('StoreMin3.lastUpdateDB')
    if (StoreMin3.lastUpdateDB) StoreMin3.lastUpdateDB = new Date(StoreMin3.lastUpdateDB)
    // await StoreMin3.loadInMatrix()
    // await StoreMin3.trends()
  }

  static async loadInMatrix() {
    console.log('#StoreMin3', 'Load matrix')
    // const data = await StoreMin3.mongo.find<BittrexMin3Trading>(BittrexMin3Trading, {
    //   $recordsPerPage: 0,
    //   $fields: { _id: 1, percent: 1, key: 1 },
    //   $sort: {
    //     key: 1,
    //     time: 1
    //   }
    // })
    // StoreMin3.matrix = await MatrixTrends.loadInMatrix(data)
  }

  static async getTradings() {
    return JSON.parse(await StoreMin3.redis.get('StoreMin3.newestTrading') || '[]')
  }

  static async insert(tradings: BittrexCachedTrading[], now: Date) {
    let caches = await StoreMin3.redis.get('StoreMin3.cached')
    if (caches) caches = JSON.parse(caches)
    else caches = {}
    if (!StoreMin3.lastUpdateDB || (StoreMin3.lastUpdateDB.getMinutes() !== now.getMinutes() && now.getMinutes() % 1 === 0)) {
      console.log('#StoreMin3', 'Inserting trading')
      StoreMin3.lastUpdateDB = now
      let data = []
      for (let e of tradings) {
        if (!caches[e.key]) caches[e.key] = {}
        let cached = caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

        const tr = {} as BittrexMin3Trading
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

        tr.low = tr.last > cached.low ? cached.low : tr.last
        tr.high = tr.last < cached.high ? cached.high : tr.last

        tr.open = cached.open !== undefined ? cached.open : tr.last
        tr.prev = cached.prev !== undefined ? cached.prev : tr.last
        tr.baseVolumePercent = cached.baseVolume !== undefined ? ((tr.baseVolume - cached.baseVolume) * 100 / cached.baseVolume) : 0

        tr.percent = (tr.last - tr.prev) * 100 / tr.prev

        tr.candlePrev = cached.candlePrev !== undefined ? cached.candlePrev : (tr.last - tr.open)
        const candlePrev = tr.candlePrev * (tr.candlePrev < 0 ? -1 : 1)
        tr.candlePercent = (tr.last - tr.open) * 100 / (candlePrev || 1)
        data.push(tr)

        cached.open = undefined
        cached.low = undefined
        cached.high = undefined
        cached.prev = tr.last
        cached.candlePrev = tr.last - tr.open
        cached.baseVolume = tr.baseVolume
      }
      await StoreMin3.mongo.insert<BittrexMin3Trading>(BittrexMin3Trading, data)
      await StoreMin3.redis.set('StoreMin3.lastUpdateDB', StoreMin3.lastUpdateDB)
      await StoreMin3.redis.set('StoreMin3.newestTrading', JSON.stringify(data))
      TrendsMin3.execute()
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
    await StoreMin3.redis.set('StoreMin3.cached', JSON.stringify(caches))
  }
}
