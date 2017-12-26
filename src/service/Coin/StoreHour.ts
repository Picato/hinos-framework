import * as _ from 'lodash'
import { MONGO, Mongo, Uuid, Collection } from "hinos-mongo/lib/mongo";
import { Redis, REDIS } from "hinos-redis/lib/redis";
import { BittrexCachedTrading } from './StoreTrading';

@Collection('BittrexHourTrading')
export class BittrexHourTrading {
  _id?: Uuid
  name: string
  market: string
  key: string
  raw_time: Date
  time: Date
  date: number
  month: number
  year: number
  hours: number
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
}

export default class StoreHour {
  @REDIS()
  private static redis: Redis
  @MONGO('coin')
  private static mongo: Mongo

  private static lastUpdateDB

  static async init() {
    StoreHour.lastUpdateDB = await StoreHour.redis.get('bittrex.lastUpdateHourDB')
    if (StoreHour.lastUpdateDB) StoreHour.lastUpdateDB = new Date(StoreHour.lastUpdateDB)
  }

  static async insert(tradings: BittrexCachedTrading[], now: Date) {
    if (!StoreHour.lastUpdateDB || (StoreHour.lastUpdateDB.getHours() !== now.getHours())) { //&& now.getMinutes() % AppConfig.app.bittrex.updateDBAfterMins === 0
      let data = []
      for (let e of tradings) {
        let prev = await StoreHour.redis.hget('bittrex.prev.hour', e.key)
        if (prev) {
          e.prev = JSON.parse(prev)
        }
        e['date'] = e.time.getDate()
        e['month'] = e.time.getMonth()
        e['year'] = e.time.getFullYear()
        e['hours'] = e.time.getHours()
        e.percent = (e.last.usdt - e.prev.usdt) * 100 / e.prev.usdt
        data.push(_.omit(e, ['low', 'high', 'baseVolume', 'volume', 'bid', 'ask']) as BittrexHourTrading)
      }
      await StoreHour.redis.hset('bittrex.prev.hour', (() => {
        let rs = {}
        data.forEach(e => {
          rs[e.key] = JSON.stringify(e.last)
        })
        return rs
      })())
      await StoreHour.mongo.insert<BittrexHourTrading>(BittrexHourTrading, data)
      StoreHour.lastUpdateDB = now
      await StoreHour.redis.set('bittrex.lastUpdateHourDB', StoreHour.lastUpdateDB)
    }
  }
}
