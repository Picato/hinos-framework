import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexTrading } from "../AI/TrendsCommon";
import { TradingTemp } from "./RawHandler";
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
  private caches

  constructor(protected skip: number) { }

  public async init() {
    console.log(`#${this.constructor.name}`, 'Initial')
    const self = this

    const [lastUpdateDB, caches] = await this.redis.manual(async redis => {
      let lastUpdateDB = await self.redis._get(redis, `${self.constructor.name}.lastUpdateDB`)
      lastUpdateDB = lastUpdateDB ? new Date(lastUpdateDB) : undefined
      let caches = await self.redis._get(redis, `${self.constructor.name}.cached`)
      caches = caches ? JSON.parse(caches) : {}

      return [lastUpdateDB, caches]
    })
    this.lastUpdateDB = lastUpdateDB
    this.caches = caches

    Redis.subscribe('updateData', (data) => {
      const { tradings, now } = JSON.parse(data)
      self.handle(tradings, new Date(now))
    }, AppConfig.redis)
  }

  async groupByTime(key, market) {
    let beforeThat = new Date()
    beforeThat.setDate(beforeThat.getDate() - 1)
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
    if (!this.lastUpdateDB || (this.lastUpdateDB.getHours() !== now.getHours() && now.getHours() % this.skip === 0)) {
      console.log(`#${this.constructor.name}`, 'Begin handle data')
      this.lastUpdateDB = now
      let data = []
      const self = this
      for (let e of tradings) {
        if (!this.caches[e.key]) this.caches[e.key] = {}
        let cached = this.caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

        const tr = {} as TradingHour
        tr._id = Mongo.uuid(e._id)
        tr.key = e.key
        tr.name = e.name
        tr.market = e.market
        tr.raw_time = new Date(e.raw_time)
        tr.time = new Date(e.time)
        tr.day = tr.time.getDay()
        tr.date = tr.time.getDate()
        tr.month = tr.time.getMonth()
        tr.year = tr.time.getFullYear()
        tr.hours = tr.time.getHours()
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
        tr.candlePrev = cached.candlePrev !== undefined ? cached.candlePrev : tr.candleLast
        const candlePrev = tr.candlePrev * (tr.candlePrev < 0 ? -1 : 1)
        const candleLast = tr.candleLast * (tr.candleLast < 0 ? -1 : 1)
        tr.candlePercent = candleLast * 100 / (candlePrev || 1)
        data.push(tr)

        cached.open = undefined
        cached.low = undefined
        cached.high = undefined
        cached.prev = tr.last
        cached.candlePrev = tr.candleLast
        cached.baseVolume = tr.baseVolume
      }
      await this.mongo.insert<TradingHour>(`${this.constructor.name}`, data)
      await this.redis.manual(async redis => {
        await self.redis._set(redis, `${self.constructor.name}.lastUpdateDB`, self.lastUpdateDB)
        await self.redis._set(redis, `${self.constructor.name}.newestTrading`, JSON.stringify(data))
        await self.redis._publish(redis, `updateData#${self.constructor.name}`, '')
        await self.redis._set(redis, `${self.constructor.name}.cached`, JSON.stringify(self.caches))
      })
      data = null
    } else {
      for (let e of tradings) {
        if (!this.caches[e.key]) this.caches[e.key] = {}
        let cached = this.caches[e.key]

        if (cached.open === undefined) cached.open = e.last

        if (cached.low === undefined) cached.low = e.last
        else cached.low = e.last > cached.low ? cached.low : e.last

        if (cached.high === undefined) cached.high = e.last
        else cached.high = e.last < cached.high ? cached.high : e.last
      }
      await this.redis.set(`${this.constructor.name}.cached`, JSON.stringify(this.caches))
    }
  }
}
