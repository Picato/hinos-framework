import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { TrendsCommon, BittrexTrading } from "./AI/TrendsCommon";
import { BittrexCachedTrading } from "./StoreTrading";

export class BittrexTradingMin extends BittrexTrading {
  name: string
  market: string
  raw_time: Date
  date: number
  month: number
  year: number
  hours: number
  minutes: number
  open: number
  baseVolume: number
  low: number
  high: number
}

export default class StoreMin extends TrendsCommon {
  @REDIS()
  protected redis: Redis
  
  @MONGO('coin')
  protected mongo: Mongo

  private lastUpdateDB

  constructor(protected min: number) {
    super(`min${min}`)
  }

  public async init() {
    console.log(`#${this.constructor.name}`, 'Initial')
    this.lastUpdateDB = await this.redis.get(`${this.constructor.name}.lastUpdateDB`)
    if (this.lastUpdateDB) this.lastUpdateDB = new Date(this.lastUpdateDB)
  }

  async find(fil) {
    return await Mongo.pool().find<BittrexTradingMin>(`BittrexTradingMin${this.min}`, fil)
  }

  async getTradings() {
    return JSON.parse(await Redis.pool().get(`${this.constructor.name}.newestTrading`) || '[]')
  }

  async handle(tradings: BittrexCachedTrading[], now: Date) {
    console.log(`#StoreMin${this.min}`, 'Begin handle data')
    let caches = await this.redis.get(`${this.constructor.name}.cached`)
    if (caches) caches = JSON.parse(caches)
    else caches = {}
    if (!this.lastUpdateDB || (this.lastUpdateDB.getMinutes() !== now.getMinutes() && now.getMinutes() % this.min === 0)) {
      this.lastUpdateDB = now
      let data = []
      for (let e of tradings) {
        if (!caches[e.key]) caches[e.key] = {}
        let cached = caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

        const tr = {} as BittrexTradingMin
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
      await this.mongo.insert<BittrexTradingMin>(`BittrexTradingMin${this.min}`, data)
      await this.redis.set(`${this.constructor.name}.lastUpdateDB`, this.lastUpdateDB)
      await this.redis.set(`${this.constructor.name}.newestTrading`, JSON.stringify(data))
      // this.execute()
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
    console.log(`#StoreMin${this.min}`, 'Finished handle data')
  }
}
