import * as _ from 'lodash'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { REDIS, Redis } from 'hinos-redis'
import axios from 'axios'
import * as bittrex from 'node-bittrex-api'
import { BotCommand } from './Telegram'

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
      listData.push(cached)
      cached.name = e.MarketName.split('-')[1]
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

  static toETH(price, market, rate) {
    return price * (rate[`${market}-ETH`] || 1)
  }
  static toBTC(price, market, rate) {
    return price * (rate[`${market}-BTC`] || 1)
  }
  static toUSDT(price, market, rate) {
    return price * (rate[`${market}-USDT`] || 1)
  }
  static formatNumber(value) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 8 })
  }
  static async autoSync() {
    console.log('Auto sync coin')
    // Bittrex.oldCoins = JSON.parse(await Bittrex.redis.get('bittrex.currencies') as string || '[]')
    // Bittrex.getNewCoin()
    Bittrex.checkingMarket()
    const bot = new BotCommand('452842559:AAFys0h9BQbDVFlhTmPPrZjzy3DjBFPI0TU') as any
    bot.hears('rate', (ctx) => ctx.reply(`1 BTC = ${CoinService.formatNumber(Bittrex.rate['BTC-USDT'])} USDT
1 ETH = ${CoinService.formatNumber(Bittrex.rate['ETH-USDT'])} USDT
1 BTC = ${CoinService.formatNumber(Bittrex.rate['BTC-ETH'])} USDT`
    ))
    bot.hears(/coin .+/i, (ctx) => {
      const coin = ctx.message.text.split(' ').filter((_e, i) => i > 0).join('').toUpperCase()
      const txt = []
      for (const c of Bittrex.coinCheckingCached) {
        if (c.name === coin) {
          if (txt.length === 0) txt.push(`#${c.name} at ${c.time.toLocaleString()}`)
          txt.push(`------------------------`)
          txt.push(`| Market ${c.market}`)
          txt.push(`------------------------`)
          if (c.market !== 'USDT') txt.push(`- ${CoinService.formatNumber(CoinService.toUSDT(c.last, c.market, Bittrex.rate))} USDT`)
          if (c.market !== 'BTC') txt.push(`- ${CoinService.formatNumber(CoinService.toBTC(c.last, c.market, Bittrex.rate))} BTC`)
          if (c.market !== 'ETH') txt.push(`- ${CoinService.formatNumber(CoinService.toETH(c.last, c.market, Bittrex.rate))} ETH`)
          txt.push(``)
        }
      }
      if (txt.length > 0) return ctx.reply(txt.join('\n'))
      return ctx.reply('Could not found this coin')
    })
    bot.startPolling()
  }

  static async getMarket() {
    return Bittrex.coinCheckingCached
  }

  static async getRate() {
    return Bittrex.rate
  }

}