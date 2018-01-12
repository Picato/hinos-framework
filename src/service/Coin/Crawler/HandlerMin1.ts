import { Redis, REDIS } from "hinos-redis/lib/redis"
import { TradingTemp } from './RawHandler'
import { BittrexTrading } from "../AI/TrendsCommon"
import Utils from "../../../common/Utils";
// import { Event } from "../Event";

export class TradingMin1 extends BittrexTrading {
  name: string
  market: string
  raw_time: Date
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
      const { tradings, now } = Utils.JSONParse(data)
      self.handle(tradings, now)
    }, AppConfig.redis)
  }

  async getTradings() {
    return JSON.parse(await this.redis.get(`${this.constructor.name}.newestTrading`) || '[]')
  }

  async handle(tradings: TradingTemp[], now: Date) {
    console.log(`#${this.constructor.name}`, 'Begin handle data')
    if (!this.lastUpdateDB || (this.lastUpdateDB.getMinutes() !== now.getMinutes())) {
      this.lastUpdateDB = now
      let data = [] as TradingMin1[]
      const self = this
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
        tr.prevBaseVolume = cached.baseVolume
        tr.baseVolumeNum = tr.baseVolume - tr.prevBaseVolume
        tr.last = e.last
        tr.num = e.last - cached.prev

        tr.prev = cached.prev !== undefined ? cached.prev : tr.last
        tr.baseVolumePercent = cached.baseVolume !== undefined ? ((tr.baseVolume - cached.baseVolume) * 100 / cached.baseVolume) : 0

        tr.percent = (tr.last - tr.prev) * 100 / tr.prev
        data.push(tr)

        cached.prev = tr.last
        cached.baseVolume = tr.baseVolume
      }
      this.redis.manual(async redis => {
        await self.redis._set(redis, `${self.constructor.name}.lastUpdateDB`, self.lastUpdateDB)
        await self.redis._set(redis, `${self.constructor.name}.newestTrading`, JSON.stringify(data))
        await self.redis._set(redis, `${self.constructor.name}.cached`, JSON.stringify(self.caches))
        await self.redis._publish(redis, `updateData#${self.constructor.name}`, '')
      })
    }
    console.log(`#${this.constructor.name}`, 'Finished handle data')
  }
}

export default new HandlerMin1()
