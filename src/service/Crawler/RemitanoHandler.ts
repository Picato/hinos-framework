import { MONGO, Mongo, Collection } from "hinos-mongo/lib/mongo";
import { REDIS, Redis } from "hinos-redis/lib/redis";
import HttpError from "../../common/HttpError";

@Collection()
export class RemitanoRate {
  currency: string
  btc_bid: number
  btc_ask: number
  eth_bid: number
  eth_ask: number
  usdt_bid: number
  usdt_ask: number
  time: Date
  day: number
  date: number
  month: number
  year: number
  hours: number
  minutes: number
  seconds: number
}

export default class RemitanoHandler {

  @MONGO()
  private static mongo: Mongo

  @REDIS()
  private static redis: Redis

  private static phantom = require('phantom')

  static page
  static lastUpdateDB

  static async getRate() {
    const rs = await RemitanoHandler.redis.get('remitano.rate')
    return (rs ? JSON.parse(rs) : {}) as RemitanoRate
  }

  static async find(fil?) {
    return await RemitanoHandler.mongo.find<RemitanoRate>(RemitanoRate, fil)
  }

  static async groupByTime(beforeThat: Date, groupBy: any) { //{ hours: '$hours', minutes: '$minutes' }
    return await RemitanoHandler.mongo.manual(RemitanoRate, async (collection) => {
      const rs0 = collection.aggregate(
        [
          {
            $match: {
              time: { $gte: beforeThat }
            }
          },
          {
            $group: groupBy
          },
          {
            $sort: {
              '_id.time': 1
            }
          }
        ]
      )
      return await rs0.toArray()
    })
  }

  static async init() {
    RemitanoHandler.lastUpdateDB = await RemitanoHandler.redis.manual(async redis => {
      let lastUpdateDB = await RemitanoHandler.redis._get(redis, `${this.constructor.name}.lastUpdateDB`)
      lastUpdateDB = lastUpdateDB ? new Date(lastUpdateDB) : undefined
      return lastUpdateDB
    })
    setInterval(RemitanoHandler.scan, AppConfig.app.bittrex.scanRemitano)
  }

  static async scan() {
    try {
      let status
      if (!RemitanoHandler.page) {
        const instance = await RemitanoHandler.phantom.create(['--ignore-ssl-errors=yes', '--load-images=no', '--disk-cache=true'], {
          // logger: yourCustomLogger,
          logLevel: 'error',
        });
        RemitanoHandler.page = await instance.createPage();
        RemitanoHandler.page.on('onResourceRequested', true, function (requestData, networkRequest) {
          if (requestData.url.indexOf('remitano') === -1) return networkRequest.abort()
        })
        status = await RemitanoHandler.page.open('https://usdt.remitano.com/vn');
        if (status !== 'success') throw HttpError.BAD_REQUEST('Could not request to remitano')
      } else {
        await RemitanoHandler.page.reload()
      }
      const content = await RemitanoHandler.page.property('content')
      const m = content.match(/"btc_rates":.*?"vn":(\{[^\}]+\})/)
      const rate = JSON.parse(m[1])
      rate.time = new Date()
      if (!RemitanoHandler.lastUpdateDB || (RemitanoHandler.lastUpdateDB.getMinutes() !== rate.time.getMinutes() && rate.time.getMinutes() % 5 == 0)) {
        RemitanoHandler.lastUpdateDB = rate.time
        rate.day = rate.time.getDay()
        rate.date = rate.time.getDate()
        rate.month = rate.time.getMonth()
        rate.year = rate.time.getFullYear()
        rate.hours = rate.time.getHours()
        rate.minutes = rate.time.getMinutes()
        rate.seconds = rate.time.getSeconds()
        await RemitanoHandler.mongo.insert(RemitanoRate, rate)
        await RemitanoHandler.redis.set(`${RemitanoHandler.constructor.name}.lastUpdateDB`, RemitanoHandler.lastUpdateDB)
      }
      await RemitanoHandler.redis.set('remitano.rate', JSON.stringify(rate))
    } catch (e) {
      console.error('phantom:remitano', e)
    }
  }
}
