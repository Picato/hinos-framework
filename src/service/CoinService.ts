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
  static coinCheckingCached = [] as any[]
  static rate = {
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
    // await Bittrex.redis.del('bittrex.trace')
    const rs = await axios.get('https://bittrex.com/api/v1.1/public/getmarketsummaries')
    const data = rs.data.result
    const caches = {}
    const listData = []
    for (let e of data) {
      if (e.MarketName === 'USDT-BTC') {
        Bittrex.rate['BTC-USDT'] = e.Last
        Bittrex.rate['USDT-BTC'] = 1 / e.Last
      } else if (e.MarketName === 'BTC-ETH') {
        Bittrex.rate['BTC-ETH'] = 1 / e.Last
        Bittrex.rate['ETH-BTC'] = e.Last
      } else if (e.MarketName === 'USDT-ETH') {
        Bittrex.rate['ETH-USDT'] = e.Last
        Bittrex.rate['USDT-ETH'] = 1 / e.Last
      }
      e.TimeStamp = new Date(e.TimeStamp)
      let cached = await Bittrex.redis.hget('bittrex.trace', e.MarketName)
      let lastUpdated
      if (cached) {
        cached = JSON.parse(cached)
        cached.time = new Date(cached.time)
        lastUpdated = new Date(cached.time)
      } else {
        cached = {
          time: undefined,
          status: undefined
        }
      }
      if (cached.status !== undefined) {
        const status = e.PrevDay - e.Last > 0 ? -1 : 1
        if (status > 0 && cached.status < 0) {
          cached.status = 1
        } else if (status < 0 && cached.status > 0) {
          cached.status = -1
        } else {
          cached.status += status
        }
      }
      if (!lastUpdated || lastUpdated.toDateString() !== e.TimeStamp.toDateString()) {
        cached.time = e.TimeStamp
        cached.status = 0
        caches[e.MarketName] = JSON.stringify(cached)
      }
      cached.prev = e.PrevDay
      cached.last = e.Last
      cached.low = e.Low
      cached.high = e.High
      cached.bid = e.Bid
      cached.ask = e.Ask
      cached.baseVolume = e.BaseVolume
      cached.volume = e.Volume
      cached.market = e.MarketName.split('-')[0]
      cached.name = e.MarketName.split('-')[1]
      listData.push(cached)
    }
    await Bittrex.redis.hset('bittrex.trace', caches)
    listData.sort((a, b) => {
      const as = (a.status < 0 ? -1 : 1) * a.status
      const bs = (b.status < 0 ? -1 : 1) * b.status
      return bs - as
    })
    Bittrex.coinCheckingCached = listData
    setTimeout(Bittrex.checkingMarket, AppConfig.app.bittrex.scanChecking)
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

  static async getCoinChecking(type) {
    const rs = {
      rate: Bittrex.rate,
      data: []
    }
    if (type === 'tangmanh') rs.data = Bittrex.coinCheckingCached.filter(e => e.status > 1)
    else if (type === 'giammanh') rs.data = Bittrex.coinCheckingCached.filter(e => e.status < -1)
    else if (type === 'binhthuong') rs.data = Bittrex.coinCheckingCached.filter(e => [0, 1, -1].includes(e.status))
    else rs.data = Bittrex.coinCheckingCached
    return rs
  }

}