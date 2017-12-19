import * as _ from 'lodash'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { REDIS, Redis } from 'hinos-redis'
import axios from 'axios'
import * as bittrex from 'node-bittrex-api'

/************************************************
 ** ChartService || 4/10/2017, 10:19:24 AM **
 ************************************************/

bittrex.options({
  apikey: AppConfig.app.bittrex.apikey,
  apisecret: AppConfig.app.bittrex.apisecret,
  inverse_callback_arguments: true
})

@Collection('coin')
export class Coin {
  _id?: Uuid
  price?: number
  type?: string
  des?: string
  date?: Date
  created_at?: Date
  updated_at?: Date
}

export class Bittrex {
  @REDIS()
  static redis: Redis

  static oldCoins = undefined as string[]

  static getCurrencies() {
    return new Promise((resolve, reject) => {
      bittrex.getcurrencies(function (err, data) {
        if (err) return reject(err)
        const coins = data.result.map(e => e.Currency)
        resolve(coins)
      });
    })
  }

  static async getNewCoin() {
    const coins = await Bittrex.getCurrencies() as string[]
    const newCoins = _.difference(coins, Bittrex.oldCoins)
    if (newCoins.length > 0) {
      CoinService.pushMessage(newCoins)
      Bittrex.oldCoins = _.uniq(coins.concat(Bittrex.oldCoins))
      Bittrex.redis.set('bittrex.currencies', JSON.stringify(Bittrex.oldCoins))
    }
    setTimeout(Bittrex.getNewCoin, AppConfig.app.bittrex.scanCurrency)
  }

  static async checkingMarket() {
    const rs = await axios.get('https://bittrex.com/api/v1.1/public/getmarketsummaries')
    const data = rs.data.result
    const caches = {}
    for (let e of data) {
      e.TimeStamp = new Date(e.TimeStamp)
      let cached = await Bittrex.redis.hget('bittrex.trace', e.MarketName)
      if (cached) {
        cached = JSON.parse(cached)
        cached.time = new Date(cached.time)
      } else {
        cached = {
          time: undefined,
          status: 0
        }
      }
      const status = e.PrevDay - e.Last > 0 ? -1 : 1
      if (status > 0 && cached.status < 0) {
        cached.status = 1
      } else if (status < 0 && cached.status > 0) {
        cached.status = -1
      } else {
        cached.status += status
      }
      if (!cached.time || (cached.time.getFullYear() === e.TimeStamp.getFullYear() && cached.time.getMonth() === e.TimeStamp.getMonth() && cached.time.getDate() !== e.TimeStamp.getDate())) {
        cached.prev = e.PrevDay
        cached.last = e.Last
        cached.time = e.TimeStamp
        caches[e.MarketName] = JSON.stringify(cached)
      }
    }
    await Bittrex.redis.hset('bittrex.trace', caches)
    setTimeout(Bittrex.getNewCoin, AppConfig.app.bittrex.scanChecking)
  }

  static async getCoinChecking() {
    const rs = await Bittrex.redis.hget('bittrex.trace')
    if (rs) {
      for (let k in rs) {
        rs[k] = JSON.parse(rs[k])
      }
      return rs
    }
    return {}
  }
}

export class CoinService {
  @MONGO()
  static mongo: Mongo

  static pushMessage(coins) {
    axios.post('https://hooks.slack.com/services/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', {
      text: `Have just got new coin is ${coins.join(', ')}`
    }, {
        headers: {
          'content-type': 'application/json'
        }
      })
  }

  static async autoSync() {
    console.log('Auto sync coin')
    Bittrex.oldCoins = JSON.parse(await Bittrex.redis.get('bittrex.currencies') as string || '[]')
    Bittrex.getNewCoin()
    Bittrex.checkingMarket()
  }

  static async getCoinChecking() {
    return await Bittrex.getCoinChecking()
  }

}