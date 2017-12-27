import { REDIS, Redis } from "hinos-redis/lib/redis"
import { Mongo, Collection, Uuid } from "hinos-mongo/lib/mongo"
import BittrexApi from './BittrexApi'
import StoreMin from './StoreMin'
import StoreHour from './StoreHour'
import StoreDay from "./StoreDay";
import { Notification } from "./Notification";

@Collection('BittrexCachedTrading')
export class BittrexCachedTrading {
  _id?: Uuid
  name: string
  market: string
  key: string
  raw_time: Date
  time: Date
  prev: {
    usdt: number
    btc: number
    eth: number
  }
  last: {
    usdt: number
    btc: number
    eth: number
  }
  percent: number
  bid: {
    usdt: number
    btc: number
    eth: number
  }
  ask: {
    usdt: number
    btc: number
    eth: number
  }
  low: {
    usdt: number,
    btc: number,
    eth: number,
  }
  high: {
    usdt: number,
    btc: number,
    eth: number,
  }
  baseVolume: {
    usdt: number,
    btc?: number,
    eth?: number,
  }
  volume: {
    usdt: number,
    btc?: number,
    eth?: number,
  }
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
  }

  static async executed(tradings: BittrexCachedTrading[], now: Date) {
    console.log('executed')
    await Promise.all([
      StoreMin.insert(tradings, now),
      StoreHour.insert(tradings, now),
      StoreDay.insert(tradings, now),
      Notification.checkNotification(tradings, now)
    ])
  }

  public static async execute() {
    try {
      // await StoreTrading.redis.del('bittrex.trace')
      const data = await BittrexApi.getMarketSummaries()
      const tradings = [] as BittrexCachedTrading[]
      let rate = data.find(e => e.MarketName === 'USDT-BTC')
      BittrexApi.rate['BTC-USDT'] = rate.Last
      BittrexApi.rate['USDT-BTC'] = 1 / rate.Last
      rate = data.find(e => e.MarketName === 'BTC-ETH')
      BittrexApi.rate['BTC-ETH'] = 1 / rate.Last
      BittrexApi.rate['ETH-BTC'] = rate.Last
      rate = data.find(e => e.MarketName === 'USDT-ETH')
      BittrexApi.rate['ETH-USDT'] = rate.Last
      BittrexApi.rate['USDT-ETH'] = 1 / rate.Last
      const now = new Date()
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
        let prev = await StoreTrading.redis.hget('bittrex.prev', e.MarketName)
        if (prev) {
          cached.prev = JSON.parse(prev)
        } else {
          cached.prev = {
            usdt: BittrexApi.toUSDT(e.PrevDay, cached.market, BittrexApi.rate),
            btc: BittrexApi.toBTC(e.PrevDay, cached.market, BittrexApi.rate),
            eth: BittrexApi.toETH(e.PrevDay, cached.market, BittrexApi.rate)
          }
        }
        cached.last = {
          usdt: BittrexApi.toUSDT(e.Last, cached.market, BittrexApi.rate),
          btc: BittrexApi.toBTC(e.Last, cached.market, BittrexApi.rate),
          eth: BittrexApi.toETH(e.Last, cached.market, BittrexApi.rate)
        }
        cached.percent = (cached.last.usdt - cached.prev.usdt) * 100 / cached.prev.usdt
        cached.bid = {
          usdt: BittrexApi.toUSDT(e.Bid, cached.market, BittrexApi.rate),
          btc: BittrexApi.toBTC(e.Bid, cached.market, BittrexApi.rate),
          eth: BittrexApi.toETH(e.Bid, cached.market, BittrexApi.rate)
        }
        cached.ask = {
          usdt: BittrexApi.toUSDT(e.Ask, cached.market, BittrexApi.rate),
          btc: BittrexApi.toBTC(e.Ask, cached.market, BittrexApi.rate),
          eth: BittrexApi.toETH(e.Ask, cached.market, BittrexApi.rate)
        }
        cached.low = {
          usdt: BittrexApi.toUSDT(e.Low, cached.market, BittrexApi.rate),
          btc: BittrexApi.toBTC(e.Low, cached.market, BittrexApi.rate),
          eth: BittrexApi.toETH(e.Low, cached.market, BittrexApi.rate)
        }
        cached.high = {
          usdt: BittrexApi.toUSDT(e.High, cached.market, BittrexApi.rate),
          btc: BittrexApi.toBTC(e.High, cached.market, BittrexApi.rate),
          eth: BittrexApi.toETH(e.High, cached.market, BittrexApi.rate)
        }
        cached.baseVolume = {
          usdt: BittrexApi.toUSDT(e.BaseVolume, e.market, BittrexApi.rate),
          btc: e.market === 'BTC' ? e.BaseVolume : undefined,
          eth: e.market === 'ETH' ? e.BaseVolume : undefined
        }
        cached.volume = {
          usdt: BittrexApi.toUSDT(e.Volume, e.market, BittrexApi.rate),
          btc: e.market === 'BTC' ? e.Volume : undefined,
          eth: e.market === 'ETH' ? e.Volume : undefined
        }
        tradings.push(cached)
      }
      await StoreTrading.redis.hset('bittrex.prev', (() => {
        let rs = {}
        tradings.forEach(e => {
          rs[e.key] = JSON.stringify(e.last)
        })
        return rs
      })())
      BittrexApi.newestTrading = tradings
      await StoreTrading.executed(tradings, now)
    } catch (e) {
      console.error(e)
    }
  }
}
