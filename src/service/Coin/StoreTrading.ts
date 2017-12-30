import { REDIS, Redis } from "hinos-redis/lib/redis"
import { Mongo, Collection, Uuid } from "hinos-mongo/lib/mongo"
import BittrexApi from './BittrexApi'
import StoreMin from './StoreMin'
import StoreHour from './StoreHour'
import StoreDay from "./StoreDay"
import BittrexAlert from "./BittrexAlert";
import BittrexUser from "./BittrexUser";

@Collection('BittrexCachedTrading')
export class BittrexCachedTrading {
  _id?: Uuid
  name: string
  market: string
  key: string
  raw_time: Date
  time: Date
  prev: number
  last: number
  percent: number
  bid: number
  ask: number
  baseVolume: number
  volume: number
  low: number
  high: number
}

export class StoreTrading {

  @REDIS()
  private static redis: Redis

  static async init() {
    await Promise.all([
      StoreMin.init(),
      StoreHour.init(),
      StoreDay.init()
    ])
    setInterval(StoreTrading.execute, AppConfig.app.bittrex.scanChecking)
  }

  static async updateData(tradings: BittrexCachedTrading[], now: Date) {
    console.log('executed')
    await Promise.all([
      StoreMin.insert(tradings, now),
      StoreHour.insert(tradings, now),
      StoreDay.insert(tradings, now),
      BittrexAlert.checkAlert(tradings, now),
      BittrexAlert.checkOrder()
    ])
  }

  public static async execute() {
    try {
      // await StoreTrading.redis.del('bittrex.trace')
      const data = await BittrexUser.getMarketSummaries()
      const now = new Date()
      StoreTrading.handleRate(data)
      const tradings = await StoreTrading.handleData(data, now)
      await StoreTrading.updateData(tradings, now)
    } catch (e) {
      console.error(e)
    }
  }

  static handleRate(data: any[]) {
    let rate = data.find(e => e.MarketName === 'USDT-BTC')
    BittrexApi.rate['BTC-USDT'] = rate.Last
    BittrexApi.rate['USDT-BTC'] = 1 / rate.Last
    rate = data.find(e => e.MarketName === 'BTC-ETH')
    BittrexApi.rate['BTC-ETH'] = 1 / rate.Last
    BittrexApi.rate['ETH-BTC'] = rate.Last
    rate = data.find(e => e.MarketName === 'USDT-ETH')
    BittrexApi.rate['ETH-USDT'] = rate.Last
    BittrexApi.rate['USDT-ETH'] = 1 / rate.Last
  }

  static async handleData(data: any[], now: Date) {
    const tradings = [] as BittrexCachedTrading[]
    for (let e of data) {
      let cached = new BittrexCachedTrading()
      cached._id = Mongo.uuid()
      cached.key = e.MarketName
      e.MarketName.split('-').forEach((e, i) => {
        if (i === 0) cached.market = e
        else if (i === 1) cached.name = e
      })
      cached.raw_time = new Date(e.TimeStamp)
      cached.time = now
      cached.last = e.Last
      let prev = await StoreTrading.redis.hget('StoreHour.prevCached', e.MarketName)
      if (prev) {
        prev = JSON.parse(prev)
        cached.prev = prev.last
        cached.low = cached.last < prev.low ? cached.last : prev.low
        cached.high = cached.last > prev.high ? cached.last : prev.high
      } else {
        cached.low = cached.high = cached.last
      }
      cached.percent = (cached.last - cached.prev) * 100 / cached.prev
      cached.bid = e.Bid
      cached.ask = e.Ask
      cached.baseVolume = e.BaseVolume
      cached.volume = e.Volume
      tradings.push(cached)
    }
    return BittrexApi.newestTrading = tradings
  }
}