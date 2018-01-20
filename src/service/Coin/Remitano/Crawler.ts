import { MONGO, Mongo, Collection } from "hinos-mongo/lib/mongo";
import HttpError from "../../../common/HttpError";
import { REDIS, Redis } from "hinos-redis/lib/redis";

const phantom = require('phantom');

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

class RemitanoCrawler {

  @MONGO('coin')
  private mongo: Mongo

  @REDIS()
  private redis: Redis

  page
  lastUpdateDB

  async getRate() {
    const rs = await this.redis.get('remitano.rate')
    return rs ? JSON.parse(rs) : {}
  }

  async find(fil?) {
    return await this.mongo.find<RemitanoRate>(RemitanoRate, fil)
  }

  async groupByTime(beforeThat: Date, groupBy: any) { //{ hours: '$hours', minutes: '$minutes' }
    return await this.mongo.manual(RemitanoRate, async (collection) => {
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

  async init() {
    const self = this
    
    setInterval(() => {
      self.scan.apply(self)
    }, AppConfig.app.bittrex.scanRemitano)

    this.lastUpdateDB = await this.redis.manual(async redis => {
      let lastUpdateDB = await this.redis._get(redis, `${this.constructor.name}.lastUpdateDB`)
      lastUpdateDB = lastUpdateDB ? new Date(lastUpdateDB) : undefined
      return lastUpdateDB
    })
  }

  async scan() {
    try {
      let status
      if (!this.page) {
        const instance = await phantom.create(['--ignore-ssl-errors=yes', '--load-images=no', '--disk-cache=true'], {
          // logger: yourCustomLogger,
          logLevel: 'error',
        });
        this.page = await instance.createPage();
        this.page.on('onResourceRequested', true, function (requestData, networkRequest) {
          if (requestData.url.indexOf('remitano') === -1) return networkRequest.abort()
        })
        status = await this.page.open('https://usdt.remitano.com/vn');
        if (status !== 'success') throw HttpError.BAD_REQUEST('Could not request to remitano')
      } else {
        await this.page.reload()
      }
      const content = await this.page.property('content')
      const m = content.match(/"btc_rates":.*?"vn":(\{[^\}]+\})/)
      const rate = JSON.parse(m[1])
      rate.time = new Date()
      if (!this.lastUpdateDB || (this.lastUpdateDB.getMinutes() !== rate.time.getMinutes() && rate.time.getMinutes() % 5 == 0)) {
        this.lastUpdateDB = rate.time
        rate.day = rate.time.getDay()
        rate.date = rate.time.getDate()
        rate.month = rate.time.getMonth()
        rate.year = rate.time.getFullYear()
        rate.hours = rate.time.getHours()
        rate.minutes = rate.time.getMinutes()
        rate.seconds = rate.time.getSeconds()
        await this.mongo.insert(RemitanoRate, rate)
        await this.redis.set(`${this.constructor.name}.lastUpdateDB`, this.lastUpdateDB)
      }
      await this.redis.set('remitano.rate', JSON.stringify(rate))
    } catch (e) {
      console.error('phantom:remitano', e)
    }
  }
}
export default new RemitanoCrawler()
