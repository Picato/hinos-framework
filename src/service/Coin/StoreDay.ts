import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'
// import Trends from "./AI/Trends";
// import { MatrixTrends } from './MatrixTrends'

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
  open: number
  prev: number
  last: number
  percent: number
  baseVolume: number
  baseVolumePercent: number
  low: number
  high: number
}

export default class StoreDay {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  // static trending
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async find(fil) {
    return await StoreDay.mongo.find<BittrexDayTrading>(BittrexDayTrading, fil)
  }

  static async init() {
    console.log('#StoreDay', 'Initial')
    StoreDay.lastUpdateDB = await StoreDay.redis.get('StoreDay.lastUpdateDB')
    if (StoreDay.lastUpdateDB) StoreDay.lastUpdateDB = new Date(StoreDay.lastUpdateDB)
    // await StoreDay.loadInMatrix()
    // await StoreDay.trends()
  }

  static async loadInMatrix() {
    console.log('#StoreDay', 'Load matrix')
    // const data = await StoreDay.mongo.find<BittrexDayTrading>(BittrexDayTrading, {
    //   $recordsPerPage: 0,
    //   $fields: { _id: 1, percent: 1, key: 1 },
    //   $sort: {
    //     key: 1,
    //     time: 1
    //   }
    // })
    // StoreDay.matrix = await MatrixTrends.loadInMatrix(data)
  }

  static async getTradings() {
    return JSON.parse(await StoreDay.redis.get('StoreDay.newestTrading') || '[]')
  }

  static async insert(tradings: BittrexCachedTrading[], now: Date) {
    let caches = await StoreDay.redis.get('StoreDay.cached')
    if (caches) caches = JSON.parse(caches)
    else caches = {}
    if (!StoreDay.lastUpdateDB || StoreDay.lastUpdateDB.getDate() !== now.getDate()) {
      console.log('#StoreDay', 'Inserting trading')
      StoreDay.lastUpdateDB = now
      let data = []
      for (let e of tradings) {
        if (!caches[e.key]) caches[e.key] = {}
        let cached = caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

        const tr = {} as BittrexDayTrading
        tr._id = e._id
        tr.key = e.key
        tr.name = e.name
        tr.market = e.market
        tr.raw_time = e.raw_time
        tr.time = e.time
        tr.date = e.time.getDate()
        tr.month = e.time.getMonth()
        tr.year = e.time.getFullYear()
        tr.baseVolume = e.baseVolume
        tr.last = e.last

        tr.low = tr.last > cached.low ? cached.low : tr.last
        tr.high = tr.last < cached.high ? cached.high : tr.last

        tr.open = cached.open !== undefined ? cached.open : tr.last
        tr.prev = cached.prev !== undefined ? cached.prev : tr.last
        tr.baseVolumePercent = cached.baseVolume !== undefined ? ((tr.baseVolume - cached.baseVolume) * 100 / cached.baseVolume) : 0

        tr.percent = (tr.last - tr.prev) * 100 / tr.prev
        data.push(tr)

        cached.open = undefined
        cached.low = undefined
        cached.high = undefined
        cached.prev = tr.last
        cached.baseVolume = tr.baseVolume
      }
      await StoreDay.mongo.insert<BittrexDayTrading>(BittrexDayTrading, data)
      await StoreDay.redis.set('StoreDay.lastUpdateDB', StoreDay.lastUpdateDB)
      await StoreDay.redis.set('StoreDay.newestTrading', JSON.stringify(data))
      await StoreDay.trends()
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
    await StoreDay.redis.set('StoreDay.cached', JSON.stringify(caches))
  }

  static async trends() {
    console.log('#StoreDay', 'Calculate simple trends')
    // Trends.trendsMinutes()
  }
}
