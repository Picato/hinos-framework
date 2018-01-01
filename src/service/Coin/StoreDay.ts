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

        if (caches.$open === undefined) caches.$open = e.last
        if (caches.$baseVolume === undefined) caches.$baseVolume = e.baseVolume

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
        delete caches[e.key]

        tr.prev = caches.$open !== undefined ? caches.$open : tr.last
        tr.baseVolumePercent = caches.$baseVolume !== undefined ? ((tr.baseVolume - caches.$baseVolume) * 100 / caches.$baseVolume) : 0

        tr.percent = (tr.last - tr.prev) * 100 / tr.prev
        caches.$open = undefined
        caches.$baseVolume = undefined
        data.push(tr) 
      }
      await StoreDay.mongo.insert<BittrexDayTrading>(BittrexDayTrading, data)      
      await StoreDay.redis.set('StoreDay.lastUpdateDB', StoreDay.lastUpdateDB)      
      await StoreDay.redis.set('StoreDay.newestTrading', JSON.stringify(data))
      await StoreDay.trends()
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
    await StoreDay.redis.set('StoreDay.cached', JSON.stringify(caches))
  }

  static async trends() {
    console.log('#StoreDay', 'Calculate simple trends')
    // Trends.trendsMinutes()
    // let beforeThat = new Date()
    // beforeThat.setMinutes(beforeThat.getMinutes() - 30)
    // const data = await StoreDay.mongo.find<BittrexDayTrading>(BittrexDayTrading, {
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
    // StoreDay.trending = MatrixTrends.trends(data, StoreDay.matrix, 0.1)
  }
}
