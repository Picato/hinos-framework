import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'
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

        if (caches.$open === undefined) caches.$open = e.last
        if (caches.$baseVolume === undefined) caches.$baseVolume = e.baseVolume

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
        delete caches[e.key]

        tr.prev = caches.$open !== undefined ? caches.$open : tr.last
        tr.baseVolumePercent = caches.$baseVolume !== undefined ? ((tr.baseVolume - caches.$baseVolume) * 100 / caches.$baseVolume) : 0

        tr.percent = (tr.last - tr.prev) * 100 / tr.prev
        caches.$open = undefined
        caches.$baseVolume = undefined
        data.push(tr) 
      }
      await StoreHour.mongo.insert<BittrexHourTrading>(BittrexHourTrading, data)      
      await StoreHour.redis.set('StoreHour.lastUpdateDB', StoreHour.lastUpdateDB)      
      await StoreHour.redis.set('StoreHour.newestTrading', JSON.stringify(data))
      await StoreHour.trends()
    } else {
      for (let e of tradings) {
        if (!caches[e.key]) caches[e.key] = {}
        let cached = caches[e.key]

        if (caches.$open === undefined) caches.$open = e.last
        if (caches.$baseVolume === undefined) caches.$baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        else cached.low = e.last > cached.low ? cached.low : e.last

        if (cached.high === undefined) cached.high = e.last
        else cached.high = e.last < cached.high ? caches[e.key].high : e.last
      }
    }
    await StoreHour.redis.set('StoreHour.cached', JSON.stringify(caches))
  }

  static async trends() {
    console.log('#StoreHour', 'Calculate simple trends')
    // Trends.trendsMinutes()
    // let beforeThat = new Date()
    // beforeThat.setMinutes(beforeThat.getMinutes() - 30)
    // const data = await StoreHour.mongo.find<BittrexHourTrading>(BittrexHourTrading, {
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
    // StoreHour.trending = MatrixTrends.trends(data, StoreHour.matrix, 0.1)
  }
}
