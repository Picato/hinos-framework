import { REDIS, Redis } from "hinos-redis/lib/redis"
import { Mongo, Uuid } from "hinos-mongo/lib/mongo"
import HandlerMin1 from "./HandlerMin1"
import HandlerMin5 from './HandlerMin5'
import HandlerMin3 from './HandlerMin3'
import HandlerMin30 from './HandlerMin30'
// import HandlerHour1 from './HandlerHour1'
// import HandlerDay1 from "./HandlerDay1"
// import BittrexAlert from "./BittrexAlert";
import BittrexUser from "../Bittrex/BittrexUser";
import { EventEmitter } from "events";

export class TradingTemp {
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
  baseVolumePercent: number
  volume: number
}

class _RawTrading {

  @REDIS()
  private redis: Redis

  public event = new EventEmitter()

  constructor() {

  }

  async init() {
    await Promise.all([
      HandlerMin1.init(),
      HandlerMin3.init(),
      HandlerMin5.init(),
      HandlerMin30.init(),
      // HandlerHour1.init(),
      // HandlerDay1.init()
    ])

    this.event.on('updateData', (tradings: TradingTemp[], now: Date) => HandlerMin1.handle.call(HandlerMin1, tradings, now))
    this.event.on('updateData', (tradings: TradingTemp[], now: Date) => HandlerMin3.handle.call(HandlerMin3, tradings, now))
    this.event.on('updateData', (tradings: TradingTemp[], now: Date) => HandlerMin5.handle.call(HandlerMin5, tradings, now))
    this.event.on('updateData', (tradings: TradingTemp[], now: Date) => HandlerMin30.handle.call(HandlerMin30, tradings, now))

    this.prepareStartExecute.apply(this)
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

      this.event.emit('updateData', tradings, now)
      // Promise.all([
      //   // HandlerMin1.insert(tradings, now),
      //   this.storeMin3.insert(tradings, now),
      //   // HandlerMin5.insert(tradings, now),
      //   // HandlerMin30.insert(tradings, now),
      //   // HandlerHour1.insert(tradings, now),
      //   // HandlerDay1.insert(tradings, now),
      //   // BittrexAlert.checkOrder(),
      //   // BittrexAlert.checkAlert(tradings, now)
      // ])
    } catch (e) {
      console.error(e)
    }
  }

  private prepareStartExecute() {
    // if (new Date().getSeconds() !== 0) return setTimeout(this.prepareStartExecute, 1000)
    setInterval(() => {
      this.execute.apply(this)
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
      trading.baseVolumePercent = !cached ? 0 : (trading.baseVolume - cached.baseVolume) * 100 / cached.baseVolume
      tradings.push(trading)
    }
    return tradings
  }
}
const RawTrading = new _RawTrading()
export default RawTrading
