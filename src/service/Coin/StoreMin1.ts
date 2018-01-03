import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexCachedTrading } from './StoreTrading'
import { BittrexTrading, TrendsCommon } from "./AI/TrendsCommon"
import { TrendsMessage, TrendsMessageService } from "./AI/TrendsMessage"

export class BittrexMin1Trading extends BittrexTrading {
  name: string
  market: string
  raw_time: Date
  baseVolume: number
}

class StoreMin1 extends TrendsCommon {
  @REDIS()
  private redis: Redis

  // static trending
  matrix = [] as string[][]

  private lastUpdateDB
  private caches

  async init() {
    console.log('#StoreMin1', 'Initial')
    this.lastUpdateDB = await this.redis.get('this.lastUpdateDB')
    if (this.lastUpdateDB) this.lastUpdateDB = new Date(this.lastUpdateDB)

    const caches = await this.redis.get('this.cached')
    if (caches) this.caches = JSON.parse(caches)
    else this.caches = {}
  }
  async getTradings() {
    return JSON.parse(await this.redis.get('this.newestTrading') || '[]')
  }

  async handle(tradings: BittrexCachedTrading[], now: Date) {
    if (!this.lastUpdateDB || (this.lastUpdateDB.getMinutes() !== now.getMinutes() && now.getMinutes() % 1 === 0)) {
      console.log('#StoreMin1', 'Inserting trading')

      this.lastUpdateDB = now
      let data = [] as BittrexMin1Trading[]
      for (let e of tradings) {
        if (!this.caches[e.key]) this.caches[e.key] = {}
        let cached = this.caches[e.key]

        if (cached.prev === undefined) cached.prev = e.last
        if (cached.baseVolume === undefined) cached.baseVolume = e.baseVolume

        if (cached.low === undefined) cached.low = e.last
        if (cached.high === undefined) cached.high = e.last

        const tr = {} as BittrexMin1Trading
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
      this.execute(data)
    }
  }

  async execute(data) {
    let msgs = []
    let maxPercent = data
      .sort((a, b) => (b.percent > 0 ? b.percent : (b.percent * -1)) - (a.percent > 0 ? a.percent : (a.percent * -1)))
      .filter(e => e.percent > 2)
      .slice(0, 6)
    msgs = msgs.concat(maxPercent.map(e => {
      return { key: e.key, txt: `Đang ${e.percent > 0 ? 'tăng' : 'giảm'} ${e.percent}%` }
    }) as TrendsMessage[])


    const maxVolume = data
      .sort((a, b) => (b.baseVolumePercent > 0 ? b.baseVolumePercent : (b.baseVolumePercent * -1)) - (a.baseVolumePercent > 0 ? a.baseVolumePercent : (a.baseVolumePercent * -1)))
      .filter(e => e.percent > 0)
      .slice(0, 6)
    msgs = msgs.concat(maxVolume.map(e => {
      if (e.baseVolumePercent > 0)
        return { key: e.key, txt: `Thị trường đã được đổ thêm ${e.baseVolumePercent}%`, style: 'VOLUME' }
      return { key: e.key, txt: `Thị trường đã bị rút ra ${e.baseVolumePercent}%`, style: 'VOLUME' }
    }) as TrendsMessage[])

    if (msgs.length > 0) await TrendsMessageService.insert(msgs, 'min1')
  }
}

export default new StoreMin1('min1')
