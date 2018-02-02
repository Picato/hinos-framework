import { REDIS, Redis } from "hinos-redis/lib/redis"
import { Mongo, Uuid } from "hinos-mongo/lib/mongo"
import BittrexService from "../BittrexService";
import Utils from "../../common/Utils";
import { TRACE, TRACER } from "hinos-log/lib/tracer";
import { LOGGER } from "hinos-log/lib/logger";
import { Logger } from "log4js";
// import { Event } from "../Event";

export class TradingTemp {
  _id?: Uuid
  key: string
  name: string
  market: string
  raw_time: Date
  time: Date
  prev: number
  last: number
  bid: number
  ask: number
  prevBaseVolume: number
  baseVolume: number
  volume: number

  get num() {
    return Utils.toFixNum(this.last - (this.prev || this.last))
  }
  get percent() {
    return Utils.toFixNum(this.num * 100 / (this.prev || this.last))
  }
  get baseVolumeNum() {
    return Utils.toFixNum(this.baseVolume - (this.prevBaseVolume || this.baseVolume))
  }
  get baseVolumePercent() {
    return Utils.toFixNum(this.baseVolumeNum * 100 / (this.prevBaseVolume || this.baseVolume))
  }
}

export default class RawHandler {
  @LOGGER()
  private static logger: Logger

  @REDIS()
  private static redis: Redis

  static init() {
    setInterval(async () => {
      await RawHandler.execute()
    }, AppConfig.app.bittrex.scanTimeout)
  }

  static async getTradings() {
    return JSON.parse(await RawHandler.redis.get('RawHandler.newestTrading') || '[]') as TradingTemp[]
  }

  static async getRate() {
    return JSON.parse(await RawHandler.redis.get('RawHandler.rate') || '[]') as { [key: string]: number }
  }

  @TRACE({ type: TRACER.EXECUTE_TIME })
  static async execute() {
    try {
      const now = new Date()
      const data = await BittrexService.getMarketSummaries()
      const [rate, tradings] = await Promise.all([
        RawHandler.handleRate(data),
        RawHandler.handleData(data, now)
      ])
      await RawHandler.redis.manual(async redis => {
        await RawHandler.redis._set(redis, 'RawHandler.rate', JSON.stringify(rate))
        await RawHandler.redis._set(redis, 'RawHandler.newestTrading', JSON.stringify(tradings))
        await RawHandler.redis._publish(redis, 'updateData', JSON.stringify({ tradings: tradings, now: now }))
      })
    } catch (e) {
      RawHandler.logger.error('Raw handler', e)
    }
  }

  private static handleRate(data: any[]) {
    return new Promise((resolve) => {
      let rs = {
        'BTC-ETH': 0,
        'BTC-USDT': 0,
        'BTC-BTC': 1,
        'USDT-BTC': 0,
        'USDT-ETH': 0,
        'USDT-USDT': 1,
        'ETH-BTC': 0,
        'ETH-USDT': 0,
        'ETH-ETH': 1
      }
      let rate = data.find(e => e.MarketName === 'USDT-BTC')
      if (rate) {
        rs['BTC-USDT'] = rate.Last
        rs['USDT-BTC'] = 1 / rate.Last
      }
      rate = data.find(e => e.MarketName === 'BTC-ETH')
      if (rate) {
        rs['BTC-ETH'] = 1 / rate.Last
        rs['ETH-BTC'] = rate.Last
      }
      rate = data.find(e => e.MarketName === 'USDT-ETH')
      if (rate) {
        rs['ETH-USDT'] = rate.Last
        rs['USDT-ETH'] = 1 / rate.Last
      }
      resolve(rs)
    })
  }

  private static async handleData(data: any[], now: Date) {
    const tradings = [] as TradingTemp[]
    const oldTradings = await RawHandler.getTradings()
    for (let e of data) {
      let trading = new TradingTemp()
      trading._id = Mongo.uuid()
      trading.key = e.MarketName
      const [market, name] = trading.key.split('-')
      trading.name = name
      trading.market = market
      trading.raw_time = new Date(e.TimeStamp)
      trading.time = now
      trading.last = e.Last
      trading.bid = e.Bid
      trading.ask = e.Ask
      trading.baseVolume = e.BaseVolume
      trading.volume = e.Volume
      const cached = oldTradings.find(e => e.key === trading.key)
      if (cached) {
        trading.prev = cached.last
        trading.prevBaseVolume = cached.baseVolume
      }
      tradings.push(trading)
    }
    return tradings
  }
}
