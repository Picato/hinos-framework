import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'
import Trends from "./AI/Trends";
// import { MatrixTrends } from './MatrixTrends';

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
  static newestTrading = []
  static matrix = [] as string[][]

  private static lastUpdateDB

  static async init() {
    console.log('#StoreDay', 'Initial')
    StoreDay.lastUpdateDB = await StoreDay.redis.get('StoreDay.lastUpdateDB')
    if (StoreDay.lastUpdateDB) StoreDay.lastUpdateDB = new Date(StoreDay.lastUpdateDB)
    await StoreDay.loadInMatrix()
    await StoreDay.trends()
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

  static async insert(tradings: BittrexCachedTrading[], now: Date) {
    if (!StoreDay.lastUpdateDB || (StoreDay.lastUpdateDB.getDate() !== now.getDate())) { //&& now.getMinutes() % AppConfig.app.bittrex.updateDBAfterMins === 0
      console.log('#StoreDay', 'Insert trading')
      let data = []
      for (let e of tradings) {
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
        let prev = await StoreDay.redis.hget('StoreDay.prevCached', e.key)
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
      await StoreDay.redis.hset('StoreDay.prevCached', (() => {
        let rs = {}
        data.forEach(e => {
          rs[e.key] = JSON.stringify({ last: e.last, low: e.low, high: e.high, baseVolume: e.baseVolume })
        })
        return rs
      })())
      await StoreDay.mongo.insert<BittrexDayTrading>(BittrexDayTrading, data)
      StoreDay.lastUpdateDB = now
      await StoreDay.redis.set('StoreDay.lastUpdateDB', StoreDay.lastUpdateDB)
      await StoreDay.trends()
      StoreDay.newestTrading = data
      return true
    }
    return false
  }

  // static matrixTrends(seriesPercent, allcase): string[] {
  //   const rs = MatrixTrends.calculate(seriesPercent, allcase, 0.5)
  //   if (!rs) return rs
  //   Object.keys(rs).map(e => {
  //     return { target: e, percent: rs[e] }
  //   }).sort((a, b) => b.percent - a.percent).slice(0, 10).map(e => `${e.target}: ${e.percent}%`)
  // }

  static async trends() {
    console.log('#StoreDay', 'Calculate simple trends')
    Trends.trendsDays()
    // let beforeThat = new Date()
    // beforeThat.setDate(beforeThat.getDate() - 5)
    // const data = await StoreDay.mongo.find<BittrexDayTrading>(BittrexDayTrading, {
    //   $where: {
    //     time: {
    //       $gte: beforeThat
    //     }
    //   },
    //   $recordsPerPage: 0,
    //   $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1 },
    //   $sort: {
    //     key: 1,
    //     time: -1
    //   }
    // })
    // StoreDay.trending = MatrixTrends.trends(data, StoreDay.matrix, 0.1)
  }
}
