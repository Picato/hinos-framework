import { Redis, REDIS } from "hinos-redis/lib/redis"
import { TradingTemp } from './RawHandler'
import { BittrexTrading } from "../AI/TrendsCommon"
import Utils from "../../../common/Utils";
// import { Event } from "../Event";

export class TradingMin1 extends BittrexTrading {
  name: string
  market: string
  raw_time: Date
  baseVolume: number
}

class HandlerMin1 {
  @REDIS()
  private redis: Redis

  // static trending
  matrix = [] as string[][]

  private lastUpdateDB
  private caches

  async init() {
    console.log(`#${this.constructor.name}`, 'Initial')
    this.lastUpdateDB = await this.redis.get('this.lastUpdateDB')
    if (this.lastUpdateDB) this.lastUpdateDB = new Date(this.lastUpdateDB)

    const caches = await this.redis.get('this.cached')
    if (caches) this.caches = JSON.parse(caches)
    else this.caches = {}

    const self = this
    Redis.subscribe('updateData', (data) => {
      const { tradings, now } = Utils.JSONParse(data)
      self.handle(tradings, now)
    }, AppConfig.redis)
  }

  async getTradings() {
    return JSON.parse(await this.redis.get('this.newestTrading') || '[]')
  }

  async handle(tradings: TradingTemp[], now: Date) {
    console.log(`#${this.constructor.name}`, 'Begin handle data')
    if (!this.lastUpdateDB || (this.lastUpdateDB.getMinutes() !== now.getMinutes() && now.getMinutes() % 1 === 0)) {

      this.lastUpdateDB = now
      let data = [] as TradingMin1[]
      for (let e of tradings) {
        if (!this.caches[e.key]) this.caches[e.key] = {}
        let cached = this.caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

        const tr = {} as TradingMin1
        tr._id = e._id
        tr.key = e.key
        tr.name = e.name
        tr.market = e.market
        tr.raw_time = e.raw_time
        tr.time = e.time
        tr.baseVolume = e.baseVolume
        tr.last = e.last

        tr.prev = cached.prev !== undefined ? cached.prev : tr.last
        tr.baseVolumePercent = cached.baseVolume !== undefined ? ((tr.baseVolume - cached.baseVolume) * 100 / cached.baseVolume) : 0

        tr.percent = (tr.last - tr.prev) * 100 / tr.prev
        data.push(tr)

        cached.prev = tr.last
        cached.baseVolume = tr.baseVolume
      }
      await this.redis.set('this.lastUpdateDB', this.lastUpdateDB)
      await this.redis.set('this.newestTrading', JSON.stringify(data))
      await this.redis.set('this.cached', JSON.stringify(this.caches))
      await this.redis.publish(`updateData#${this.constructor.name}`, JSON.stringify(data))
    }
    console.log(`#${this.constructor.name}`, 'Finished handle data')
  }
}

export default new HandlerMin1()
