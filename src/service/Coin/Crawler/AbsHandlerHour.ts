import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexTrading } from "../AI/TrendsCommon";
import { TradingTemp } from "./RawHandler";
import Utils from "../../../common/Utils";
// import { Event } from "../Event";

export class TradingHour extends BittrexTrading {
  name: string
  market: string
  raw_time: Date
  day: number
  date: number
  month: number
  year: number
  hours: number
  open: number
  low: number
  high: number
}

export default class AbsHandlerHour {
  @REDIS()
  protected redis: Redis

  @MONGO('coin')
  protected mongo: Mongo

  protected lastUpdateDB

  constructor(protected skip: number) { }

  public async init() {
    console.log(`#${this.constructor.name}`, 'Initial')
    this.lastUpdateDB = await this.redis.get(`${this.constructor.name}.lastUpdateDB`)
    if (this.lastUpdateDB) this.lastUpdateDB = new Date(this.lastUpdateDB)

    const self = this
    Redis.subscribe('updateData', (data) => {
      const { tradings, now } = Utils.JSONParse(data)
      self.handle(tradings, now)
    }, AppConfig.redis)
  }

  async groupByTime(key, market) {
    let beforeThat = new Date()
    beforeThat.setDate(beforeThat.getDate() - 7)
    let where = {} as any
    if (key) where.key = key
    else if (market) where.market = market
    return await this.mongo.manual(`${this.constructor.name}`, async (collection) => {
      const rs = collection.aggregate(
        [
          {
            $match: Object.assign(where, {
              time: {
                $gte: beforeThat
              }
            })
          },
          {
            $group: {
              _id: { hours: '$hours' },
              avgLowPrice: { $avg: "$low" },
              avgHighPrice: { $avg: "$high" }
            }
          },
          {
            $sort: {
              '_id.hours': 1
            }
          }
        ]
      )
      return await rs.toArray()
    })
  }

  async find(fil) {
    return await this.mongo.find<TradingHour>(`${this.constructor.name}`, fil)
  }

  async getTradings() {
    return JSON.parse(await this.redis.get(`${this.constructor.name}.newestTrading`) || '[]')
  }

  async handle(tradings: TradingTemp[], now: Date) {
    console.log(`#${this.constructor.name}`, 'Begin handle data')
    let caches = await this.redis.get(`${this.constructor.name}.cached`)
    if (caches) caches = JSON.parse(caches)
    else caches = {}
    if (!this.lastUpdateDB || (this.lastUpdateDB.getHours() !== now.getHours() && now.getHours() % this.skip === 0)) {
      this.lastUpdateDB = now
      let data = []
      for (let e of tradings) {
        if (!caches[e.key]) caches[e.key] = {}
        let cached = caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

        const tr = {} as TradingHour
        tr._id = Mongo.uuid(e._id)
        tr.key = e.key
        tr.name = e.name
        tr.market = e.market
        tr.raw_time = e.raw_time
        tr.time = e.time
        tr.day = e.time.getDay()
        tr.date = e.time.getDate()
        tr.month = e.time.getMonth()
        tr.year = e.time.getFullYear()
        tr.hours = e.time.getHours()
        tr.baseVolume = e.baseVolume
        tr.prevBaseVolume = cached.baseVolume
        tr.baseVolumeNum = tr.baseVolume - tr.prevBaseVolume
        tr.last = e.last
        tr.num = e.last - cached.prev

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
      await this.mongo.insert<TradingHour>(`${this.constructor.name}`, data)
      await this.redis.set(`${this.constructor.name}.lastUpdateDB`, this.lastUpdateDB)
      await this.redis.set(`${this.constructor.name}.newestTrading`, JSON.stringify(data))
      await this.redis.publish(`updateData#${this.constructor.name}`, '')
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
    await this.redis.set(`${this.constructor.name}.cached`, JSON.stringify(caches))
    console.log(`#${this.constructor.name}`, 'Finished handle data')
  }
}
