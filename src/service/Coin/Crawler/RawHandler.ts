import { REDIS, Redis } from "hinos-redis/lib/redis"
import { Mongo, Uuid } from "hinos-mongo/lib/mongo"
import BittrexUser from "../Bittrex/BittrexUser";
// import { Event } from "../Event";

export class TradingTemp {
  _id?: Uuid
  name: string
  market: string
  key: string
  raw_time: Date
  time: Date
  prev: number
  last: number
  num: number // last-prev
  percent: number
  bid: number
  ask: number
  prevBaseVolume: number
  baseVolume: number
  baseVolumePercent: number
  baseVolumeNum: number
  volume: number
}

class RawTrading {

  @REDIS()
  private redis: Redis

  constructor() {

  }

  public init() {
    this.prepareStartExecute()
  }

  public async getTradings() {
    return JSON.parse(await this.redis.get('RawTrading.newestTrading') || '[]') as TradingTemp[]
  }

  public async getRate() {
    return JSON.parse(await this.redis.get('RawTrading.rate') || '[]') as { [key: string]: number }
  }

  public async execute() {
    try {
      // await this.redis.del('bittrex.trace')
      const data = await BittrexUser.getMarketSummaries()
      const now = new Date()

      const rate = await this.handleRate(data)
      await this.redis.set('RawTrading.rate', JSON.stringify(rate))

      const tradings = await this.handleData(data, now)
      await this.redis.set('RawTrading.newestTrading', JSON.stringify(tradings))

      this.redis.publish('updateData', JSON.stringify({ tradings, now }))
    } catch (e) {
      console.error(e)
    }
  }

  private prepareStartExecute() {
    const self = this
    if (new Date().getSeconds() !== 0) return setTimeout(() => {
      this.prepareStartExecute.apply(self)
    }, 1000)
    setInterval(() => {
      this.execute.apply(self)
    }, AppConfig.app.bittrex.scanChecking)
  }

  private handleRate(data: any[]) {
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
    return rs
  }

  private async handleData(data: any[], now: Date) {
    const tradings = [] as TradingTemp[]
    const oldTradings = await this.getTradings()
    for (let e of data) {
      let trading = new TradingTemp()
      trading._id = Mongo.uuid()
      trading.key = e.MarketName
      e.MarketName.split('-').forEach((e, i) => {
        if (i === 0) trading.market = e
        else if (i === 1) trading.name = e
      })
      trading.raw_time = new Date(e.TimeStamp)
      trading.time = now
      trading.last = e.Last
      trading.bid = e.Bid
      trading.ask = e.Ask
      trading.baseVolume = e.BaseVolume
      trading.volume = e.Volume
      const cached = oldTradings.find(e => e.key === trading.key)
      trading.prev = !cached ? trading.last : cached.last
      trading.percent = !cached ? 0 : (trading.last - cached.last) * 100 / cached.last
      trading.num = trading.last - trading.prev
      trading.prevBaseVolume = !cached ? trading.baseVolume : cached.baseVolume
      trading.baseVolumePercent = (trading.baseVolume - trading.prevBaseVolume) * 100 / cached.baseVolume
      trading.baseVolumeNum = trading.baseVolume - cached.baseVolume
      tradings.push(trading)
    }
    return tradings
  }
}

export default new RawTrading()
