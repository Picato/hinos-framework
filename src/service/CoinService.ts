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

  static getMarketSummaries() {
    return new Promise<any[]>((resolve, reject) => {
      bittrex.getmarketsummaries(function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
      });
    })
  }

  static getMyBalances() {
    return new Promise<any[]>((resolve, reject) => {
      bittrex.getbalances(function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
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
    const data = await Bittrex.getMarketSummaries()
    // const caches = {}
    const listData = []
    let rate = data.find(e => e.MarketName === 'USDT-BTC')
    Bittrex.rate['BTC-USDT'] = rate.Last
    Bittrex.rate['USDT-BTC'] = 1 / rate.Last
    rate = data.find(e => e.MarketName === 'BTC-ETH')
    Bittrex.rate['BTC-ETH'] = 1 / rate.Last
    Bittrex.rate['ETH-BTC'] = rate.Last
    rate = data.find(e => e.MarketName === 'USDT-ETH')
    Bittrex.rate['ETH-USDT'] = rate.Last
    Bittrex.rate['USDT-ETH'] = 1 / rate.Last
    for (let e of data) {
      let cached = {} as any
      cached.time = new Date(e.TimeStamp)
      cached.date = cached.time.getDate()
      cached.month = cached.time.getMonth()
      cached.year = cached.time.getFullYear()
      cached.hours = cached.time.getHours()
      cached.minutes = cached.time.getMinutes()
      // let cached = await Bittrex.redis.hget('bittrex.trace', e.MarketName)
      e.MarketName.split('-').forEach((e, i) => {
        if (i === 0) cached.market = e
        else if (i === 1) cached.name = e
      })
      cached.prev = {
        usdt: CoinService.toUSDT(e.PrevDay, cached.market, Bittrex.rate),
        btc: CoinService.toBTC(e.PrevDay, cached.market, Bittrex.rate),
        eth: CoinService.toETH(e.PrevDay, cached.market, Bittrex.rate)
      }
      cached.last = {
        usdt: CoinService.toUSDT(e.Last, cached.market, Bittrex.rate),
        btc: CoinService.toBTC(e.Last, cached.market, Bittrex.rate),
        eth: CoinService.toETH(e.Last, cached.market, Bittrex.rate)
      }
      cached.low = {
        usdt: CoinService.toUSDT(e.Low, cached.market, Bittrex.rate),
        btc: CoinService.toBTC(e.Low, cached.market, Bittrex.rate),
        eth: CoinService.toETH(e.Low, cached.market, Bittrex.rate)
      }
      cached.high = {
        usdt: CoinService.toUSDT(e.High, cached.market, Bittrex.rate),
        btc: CoinService.toBTC(e.High, cached.market, Bittrex.rate),
        eth: CoinService.toETH(e.High, cached.market, Bittrex.rate)
      }
      cached.bid = {
        usdt: CoinService.toUSDT(e.Bid, cached.market, Bittrex.rate),
        btc: CoinService.toBTC(e.Bid, cached.market, Bittrex.rate),
        eth: CoinService.toETH(e.Bid, cached.market, Bittrex.rate)
      }
      cached.ask = {
        usdt: CoinService.toUSDT(e.Ask, cached.market, Bittrex.rate),
        btc: CoinService.toBTC(e.Ask, cached.market, Bittrex.rate),
        eth: CoinService.toETH(e.Ask, cached.market, Bittrex.rate)
      }
      cached.baseVolume = {
        usdt: CoinService.toUSDT(e.BaseVolume, e.market, Bittrex.rate),
        btc: e.market === 'BTC' ? e.BaseVolume : undefined,
        eth: e.market === 'ETH' ? e.BaseVolume : undefined
      }
      cached.volume = {
        usdt: CoinService.toUSDT(e.Volume, e.market, Bittrex.rate),
        btc: e.market === 'BTC' ? e.Volume : undefined,
        eth: e.market === 'ETH' ? e.Volume : undefined
      }
      listData.push(cached)
    }
    // await Bittrex.redis.hset('bittrex.trace', caches)
    const now = new Date()
    if (now.getMinutes() % 5 === 0) {
      await Mongo.pool('coin').insert('BittrexTrading', listData.map(e => {
        e.updated_at = now
        return e
      }))
    }
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
    const bot = new BotCommand('496750797:AAE-e3MsQXVQZsPWRtnP9-DcldnX43GgG0A') as any
    bot.hears('help', async ({ reply }) => {
      reply(`"rate": Show btc, eth, usdt price at current time
"coin COIN_NAME": Show coin price at current time
"walletid": Show the wallet IDs
"wallet": Show the balances of wallets
`)
    })
    bot.hears(/^wallet(id)?$/i, async ({ reply, message }) => {
      const balances = await Bittrex.getMyBalances()
      const rs = balances.filter(e => e.Available).map(e => `#${e.Currency}: ${message.text.indexOf('id') !== -1 ? e.CryptoAddress : e.Available}`).join('\n')
      reply(rs)
    })
    bot.hears('rate', ({ reply }) => reply(`1 BTC = ${CoinService.formatNumber(Bittrex.rate['BTC-USDT'])} USDT
1 ETH = ${CoinService.formatNumber(Bittrex.rate['ETH-USDT'])} USDT
1 BTC = ${CoinService.formatNumber(Bittrex.rate['BTC-ETH'])} ETH`
    ))
    bot.hears(/^coin .+/i, ({ reply, message }) => {
      const coin = message.text.split(' ').filter((_e, i) => i > 0).join('').toUpperCase()
      const txt = []
      for (const c of Bittrex.coinCheckingCached) {
        if (c.name === coin) {
          if (txt.length === 0) txt.push(`#${c.name} at ${c.time.toLocaleString()}`)
          txt.push(`------------------------`)
          txt.push(`| Market ${c.market}`)
          txt.push(`------------------------`)
          if (c.name !== 'USDT') txt.push(`- ${CoinService.formatNumber(c.last.usdt)} USDT`)
          if (c.name !== 'BTC') txt.push(`- ${CoinService.formatNumber(c.last.btc)} BTC`)
          if (c.name !== 'ETH') txt.push(`- ${CoinService.formatNumber(c.last.eth)} ETH`)
          txt.push(``)
        }
      }
      if (txt.length > 0) return reply(txt.join('\n'))
      return reply('Could not found this coin')
    })
    bot.startPolling()
  }

  static async getMarket() {
    return Bittrex.coinCheckingCached
  }

  static async getRate() {
    return Bittrex.rate
  }

  static async getBittrexTrading(fil) {
    return await Mongo.pool('coin').find('BittrexTrading', fil)
  }

}