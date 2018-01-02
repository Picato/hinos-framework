import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'
import TrendsHour from "./AI/TrendsHourMessage";
// import Trends from "./AI/Trends";
// import { MatrixTrends } from './MatrixTrends'

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
  open: number
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

  // static trending
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async find(fil) {
    return await StoreHour.mongo.find<BittrexHourTrading>(BittrexHourTrading, fil)
  }

  static async init() {
    console.log('#StoreHour', 'Initial')
    StoreHour.lastUpdateDB = await StoreHour.redis.get('StoreHour.lastUpdateDB')
    if (StoreHour.lastUpdateDB) StoreHour.lastUpdateDB = new Date(StoreHour.lastUpdateDB)
    // await StoreHour.loadInMatrix()
    // await StoreHour.trends()
  }

  static async loadInMatrix() {
    console.log('#StoreHour', 'Load matrix')
    // const data = await StoreHour.mongo.find<BittrexHourTrading>(BittrexHourTrading, {
    //   $recordsPerPage: 0,
    //   $fields: { _id: 1, percent: 1, key: 1 },
    //   $sort: {
    //     key: 1,
    //     time: 1
    //   }
    // })
    // StoreHour.matrix = await MatrixTrends.loadInMatrix(data)
  }

  static async getTradings() {
    return JSON.parse(await StoreHour.redis.get('StoreHour.newestTrading') || '[]')
  }

  static async insert(tradings: BittrexCachedTrading[], now: Date) {
    let caches = await StoreHour.redis.get('StoreHour.cached')
    if (caches) caches = JSON.parse(caches)
    else caches = {}
    if (!StoreHour.lastUpdateDB || StoreHour.lastUpdateDB.getHours() !== now.getHours()) {
      console.log('#StoreHour', 'Inserting trading')
      StoreHour.lastUpdateDB = now
      let data = []
      for (let e of tradings) {
        if (!caches[e.key]) caches[e.key] = {}
        let cached = caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

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
      await StoreHour.mongo.insert<BittrexHourTrading>(BittrexHourTrading, data)
      await StoreHour.redis.set('StoreHour.lastUpdateDB', StoreHour.lastUpdateDB)
      await StoreHour.redis.set('StoreHour.newestTrading', JSON.stringify(data))
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
    await StoreHour.redis.set('StoreHour.cached', JSON.stringify(caches))
  }
}
