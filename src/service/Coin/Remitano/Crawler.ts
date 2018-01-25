import { MONGO, Mongo, Collection } from "hinos-mongo/lib/mongo";
import HttpError from "../../../common/HttpError";
import { REDIS, Redis } from "hinos-redis/lib/redis";

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

export default class RemitanoCrawler {

  @MONGO('coin')
  private static mongo: Mongo

  @REDIS()
  private static redis: Redis

  private static phantom = require('phantom')

  static page
  static lastUpdateDB

  static async getRate() {
    const rs = await RemitanoCrawler.redis.get('remitano.rate')
    return (rs ? JSON.parse(rs) : {}) as RemitanoRate
  }

  static async find(fil?) {
    return await RemitanoCrawler.mongo.find<RemitanoRate>(RemitanoRate, fil)
  }

  static async groupByTime(beforeThat: Date, groupBy: any) { //{ hours: '$hours', minutes: '$minutes' }
    return await RemitanoCrawler.mongo.manual(RemitanoRate, async (collection) => {
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
    RemitanoCrawler.lastUpdateDB = await RemitanoCrawler.redis.manual(async redis => {
      let lastUpdateDB = await RemitanoCrawler.redis._get(redis, `${this.constructor.name}.lastUpdateDB`)
      lastUpdateDB = lastUpdateDB ? new Date(lastUpdateDB) : undefined
      return lastUpdateDB
    })
    setInterval(RemitanoCrawler.scan, AppConfig.app.bittrex.scanRemitano)
  }

  static async scan() {
    try {
      let status
      if (!RemitanoCrawler.page) {
        const instance = await RemitanoCrawler.phantom.create(['--ignore-ssl-errors=yes', '--load-images=no', '--disk-cache=true'], {
          // logger: yourCustomLogger,
          logLevel: 'error',
        });
        RemitanoCrawler.page = await instance.createPage();
        RemitanoCrawler.page.on('onResourceRequested', true, function (requestData, networkRequest) {
          if (requestData.url.indexOf('remitano') === -1) return networkRequest.abort()
        })
        status = await RemitanoCrawler.page.open('https://usdt.remitano.com/vn');
        if (status !== 'success') throw HttpError.BAD_REQUEST('Could not request to remitano')
      } else {
        await RemitanoCrawler.page.reload()
      }
      const content = await RemitanoCrawler.page.property('content')
      const m = content.match(/"btc_rates":.*?"vn":(\{[^\}]+\})/)
      const rate = JSON.parse(m[1])
      rate.time = new Date()
      if (!RemitanoCrawler.lastUpdateDB || (RemitanoCrawler.lastUpdateDB.getMinutes() !== rate.time.getMinutes() && rate.time.getMinutes() % 5 == 0)) {
        RemitanoCrawler.lastUpdateDB = rate.time
        rate.day = rate.time.getDay()
        rate.date = rate.time.getDate()
        rate.month = rate.time.getMonth()
        rate.year = rate.time.getFullYear()
        rate.hours = rate.time.getHours()
        rate.minutes = rate.time.getMinutes()
        rate.seconds = rate.time.getSeconds()
        await RemitanoCrawler.mongo.insert(RemitanoRate, rate)
        await RemitanoCrawler.redis.set(`${RemitanoCrawler.constructor.name}.lastUpdateDB`, RemitanoCrawler.lastUpdateDB)
      }
      await RemitanoCrawler.redis.set('remitano.rate', JSON.stringify(rate))
    } catch (e) {
      console.error('phantom:remitano', e)
    }
  }
}
