import { REDIS, Redis } from "hinos-redis/lib/redis"
import { Mongo, Collection, Uuid } from "hinos-mongo/lib/mongo"
import StoreMin5 from './StoreMin5'
import StoreMin3 from './StoreMin3'
import StoreMin30 from './StoreMin30'
// import StoreHour from './StoreHour'
// import StoreDay from "./StoreDay"
// import BittrexAlert from "./BittrexAlert";
import BittrexUser from "./BittrexUser";
import { EventEmitter } from "events";
// import StoreMin1 from "./StoreMin1";

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
  baseVolumePercent: number
  volume: number
}

class StoreTrading {

  @REDIS()
  private redis: Redis

  private event = new EventEmitter()

  constructor() {
    this.event.on('init', () => StoreMin3.init.call(StoreMin3))
    this.event.on('init', () => StoreMin3.init.call(StoreMin5))
    this.event.on('init', () => StoreMin3.init.call(StoreMin30))

    this.event.on('updateData', (tradings: BittrexCachedTrading[], now: Date) => StoreMin3.handle.call(StoreMin3, tradings, now))
    this.event.on('updateData', (tradings: BittrexCachedTrading[], now: Date) => StoreMin5.handle.call(StoreMin5, tradings, now))
    this.event.on('updateData', (tradings: BittrexCachedTrading[], now: Date) => StoreMin30.handle.call(StoreMin30, tradings, now))
    Promise.all([
      // StoreMin1.init(),
      StoreMin3.init(),
      StoreMin5.init(),
      StoreMin30.init(),
      // StoreHour.init(),
      // StoreDay.init()
    ]).then(() => {
      this.prepareStartExecute.apply(this)
    })
  }

  public async getTradings() {
    return JSON.parse(await this.redis.get('StoreTrading.newestTrading') || '[]') as BittrexCachedTrading[]
  }

  public async getRate() {
    return JSON.parse(await this.redis.get('StoreTrading.rate') || '[]') as { [key: string]: number }
  }

  public async execute() {
    try {
      // await this.redis.del('bittrex.trace')
      const data = await BittrexUser.getMarketSummaries()
      const now = new Date()

      const rate = await this.handleRate(data)
      await this.redis.set('StoreTrading.rate', JSON.stringify(rate))

      const tradings = await this.handleData(data, now)
      await this.redis.set('StoreTrading.newestTrading', JSON.stringify(tradings))

      await this.updateData(tradings, now)
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

  private async updateData(tradings: BittrexCachedTrading[], now: Date) {
    console.log('updateData')
    this.event.emit('updateData', tradings, now)
    // Promise.all([
    //   // StoreMin1.insert(tradings, now),
    //   this.storeMin3.insert(tradings, now),
    //   // StoreMin5.insert(tradings, now),
    //   // StoreMin30.insert(tradings, now),
    //   // StoreHour.insert(tradings, now),
    //   // StoreDay.insert(tradings, now),
    //   // BittrexAlert.checkOrder(),
    //   // BittrexAlert.checkAlert(tradings, now)
    // ])
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
    const tradings = [] as BittrexCachedTrading[]
    const oldTradings = await this.getTradings()
    for (let e of data) {
      let trading = new BittrexCachedTrading()
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

export default new StoreTrading()
