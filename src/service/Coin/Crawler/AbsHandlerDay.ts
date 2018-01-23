import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { Redis, REDIS } from "hinos-redis/lib/redis"
import { BittrexTrading } from "../AI/TrendsCommon";
import { TradingTemp } from "./RawHandler";
import BittrexUser from "../Telegram/BittrexUser";
// import { Event } from "../Event";

export class TradingDay extends BittrexTrading {
  name: string
  market: string
  raw_time: Date
  day: number
  date: number
  month: number
  year: number
  open: number
  low: number
  high: number
  book: {
    buy: {
      quantity: number
      price: number
    }
    sell: {
      quantity: number
      price: number
    }
  }
}

export default class AbsHandlerDay {
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

    // Redis.subscribe('updateData', (data) => {
    //   const { tradings, now } = JSON.parse(data)
    //   self.handle(tradings, new Date(now))
    // }, AppConfig.redis)
  }

  async groupByTime(key, market, time) {
    let beforeThat = new Date()
    let now = new Date()
    let rs = {} as any
    let where = {} as any
    if (key) where.key = key
    else if (market) where.market = market
    return await this.mongo.manual(`${this.constructor.name}`, async (collection) => {
      let i = 1
      while (time >= 0) {
        beforeThat.setDate(beforeThat.getDate() - 7 * i++)        
        const rs0 = collection.aggregate(
          [
            {
              $match: Object.assign(where, {
                time: {
                  $gt: beforeThat,
                  $lte: now
                }
              })
            },
            {
              $group: {
                _id: { day: '$day' },
                avgLowPrice: { $avg: "$low" },
                avgHighPrice: { $avg: "$high" }
              }
            },
            {
              $sort: {
                '_id.date': 1
              }
            }
          ]
        )
        rs[beforeThat.toString()] = await rs0.toArray()
        now.setDate(beforeThat.getTime())
        time--
      }
      return rs
    })
  }

  async find(fil) {
    return await this.mongo.find<TradingDay>(`${this.constructor.name}`, fil)
  }

  async getTradings() {
    return JSON.parse(await this.redis.get(`${this.constructor.name}.newestTrading`) || '[]')
  }

  async handle(tradings: TradingTemp[], now: Date) {
    if (!this.lastUpdateDB || (this.lastUpdateDB.getDate() !== now.getDate() && now.getDate() % this.skip === 0)) {
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

        const tr = {} as TradingDay
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

        tr.book = {
          buy: {
            quantity: 0,
            price: 0
          },
          sell: {
            quantity: 0,
            price: 0
          }
        }
        try {
          const { buy, sell } = await BittrexUser.getOrderBook(tr.key, 'both')
          if (buy) {
            tr.book.buy = buy.reduce((sum, e) => {
              sum.quantity += e.Quantity
              sum.price += e.Rate
              return sum
            }, { quantity: 0, price: 0 })
          }
          if (sell) {
            tr.book.sell = sell.reduce((sum, e) => {
              sum.quantity += e.Quantity
              sum.price += e.Rate
              return sum
            }, { quantity: 0, price: 0 })
          }
        } catch (e) {
          console.error(e)
        }

        data.push(tr)

        cached.open = undefined
        cached.low = undefined
        cached.high = undefined
        cached.prev = tr.last
        cached.candlePrev = tr.candleLast
        cached.baseVolume = tr.baseVolume
      }
      await this.mongo.insert<TradingDay>(`${this.constructor.name}`, data)
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
