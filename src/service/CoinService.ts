// import * as _ from 'lodash'
// import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
// import { REDIS, Redis } from 'hinos-redis'
// import axios from 'axios'
// import * as bittrex from 'node-bittrex-api'
// import { BotCommand } from './Telegram'
// // import { CoinTrending } from './CoinTrending'

// /************************************************
//  ** ChartService || 4/10/2017, 10:19:24 AM **
//  ************************************************/

// bittrex.options({
//   apikey: AppConfig.app.bittrex.apikey,
//   apisecret: AppConfig.app.bittrex.apisecret,
//   inverse_callback_arguments: true
// })

// class TradingHistory {
//   time: Date
//   date: number
//   month: number
//   year: number
//   hours: number
//   minutes: number
//   prevDay: {
//     usdt: number,
//     btc: number,
//     eth: number
//   }
//   last: {
//     usdt: number,
//     btc: number,
//     eth: number,
//   }
//   low: {
//     usdt: number,
//     btc: number,
//     eth: number,
//   }
//   high: {
//     usdt: number,
//     btc: number,
//     eth: number,
//   }
//   bid: {
//     usdt: number,
//     btc: number,
//     eth: number,
//   }
//   ask: {
//     usdt: number,
//     btc: number,
//     eth: number,
//   }
//   baseVolume: {
//     usdt: number,
//     btc?: number,
//     eth?: number,
//   }
//   volume: {
//     usdt: number,
//     btc?: number,
//     eth?: number,
//   }
//   trends?: {
//     usdt: number
//   }
// }

// @Collection('BittrexTrading')
// export class BittrexTrading {
//   _id?: Uuid
//   name: string
//   market: string
//   action: string
//   buf: {
//     usdt: number
//     percent: number
//   }
//   last: {
//     usdt: number,
//     btc: number,
//     eth: number,
//   }
//   histories: TradingHistory[]
//   updated_at?: Date
// }

// export class Bittrex {
//   @REDIS()
//   static redis: Redis

//   @MONGO('coin')
//   static mongo: Mongo

//   static oldCoins = undefined as string[]
//   static coinCheckingCached = [] as any[]
//   static lastUpdateDB
//   static lastOpenPrice
//   static rate = {
//     'BTC-ETH': 0,
//     'BTC-USDT': 0,
//     'BTC-BTC': 1,
//     'USDT-BTC': 0,
//     'USDT-ETH': 0,
//     'USDT-USDT': 1,
//     'ETH-BTC': 0,
//     'ETH-USDT': 0,
//     'ETH-ETH': 1
//   }

//   static getCurrencies() {
//     return new Promise((resolve, reject) => {
//       bittrex.getcurrencies(function (err, data) {
//         if (err) return reject(err)
//         const coins = data.result.map(e => e.Currency)
//         resolve(coins)
//       });
//     })
//   }

//   static getMarketSummaries() {
//     return new Promise<any[]>((resolve, reject) => {
//       bittrex.getmarketsummaries(function (err, data) {
//         if (err) return reject(err)
//         resolve(data.result)
//       });
//     })
//   }

//   static getMyBalances() {
//     return new Promise<any[]>((resolve, reject) => {
//       bittrex.getbalances(function (err, data) {
//         if (err) return reject(err)
//         resolve(data.result)
//       });
//     })
//   }

//   static async getNewCoin() {
//     const coins = await Bittrex.getCurrencies() as string[]
//     const newCoins = _.difference(coins, Bittrex.oldCoins)
//     if (newCoins.length > 0) {
//       CoinService.pushMessage(newCoins)
//       Bittrex.oldCoins = _.uniq(coins.concat(Bittrex.oldCoins))
//       Bittrex.redis.set('bittrex.currencies', JSON.stringify(Bittrex.oldCoins))
//     }
//     setTimeout(Bittrex.getNewCoin, AppConfig.app.bittrex.scanCurrency)
//   }

//   static async checkingMarket() {
//     try {
//       // await Bittrex.redis.del('bittrex.trace')
//       const data = await Bittrex.getMarketSummaries()
//       const tradings = await Bittrex.mongo.find<BittrexTrading>(BittrexTrading, {
//         $fields: {
//           histories: {
//             $slice: [0, 10]
//           }
//         },
//         $recordsPerPage: 0
//       })
//       // const caches = {}
//       let rate = data.find(e => e.MarketName === 'USDT-BTC')
//       Bittrex.rate['BTC-USDT'] = rate.Last
//       Bittrex.rate['USDT-BTC'] = 1 / rate.Last
//       rate = data.find(e => e.MarketName === 'BTC-ETH')
//       Bittrex.rate['BTC-ETH'] = 1 / rate.Last
//       Bittrex.rate['ETH-BTC'] = rate.Last
//       rate = data.find(e => e.MarketName === 'USDT-ETH')
//       Bittrex.rate['ETH-USDT'] = rate.Last
//       Bittrex.rate['USDT-ETH'] = 1 / rate.Last
//       const now = new Date()
//       for (let e of data) {
//         let name, market
//         e.MarketName.split('-').forEach((e, i) => {
//           if (i === 0) market = e
//           else if (i === 1) name = e
//         })
//         let cached = tradings.find(e => e.name === name && e.market === market)
//         if (!cached) {
//           tradings.push({
//             _id: Mongo.uuid(),
//             action: 'I',
//             name,
//             market,
//             histories: []
//           } as BittrexTrading)
//           cached = tradings.find(e => e.name === name && e.market === market)
//         } else {
//           cached.action = 'U'
//         }
//         let history = {
//           _id: Mongo.uuid()
//         } as any
//         history.raw_time = new Date(e.TimeStamp)
//         history.time = now
//         history.month = now.getMonth()
//         history.year = now.getFullYear()
//         history.hours = now.getHours()
//         history.minutes = now.getMinutes()
//         // let cached = await Bittrex.redis.hget('bittrex.trace', e.MarketName)        
//         history.prev_day = {
//           usdt: CoinService.toUSDT(e.PrevDay, cached.market, Bittrex.rate),
//           btc: CoinService.toBTC(e.PrevDay, cached.market, Bittrex.rate),
//           eth: CoinService.toETH(e.PrevDay, cached.market, Bittrex.rate)
//         }
//         history.last = {
//           usdt: CoinService.toUSDT(e.Last, cached.market, Bittrex.rate),
//           btc: CoinService.toBTC(e.Last, cached.market, Bittrex.rate),
//           eth: CoinService.toETH(e.Last, cached.market, Bittrex.rate)
//         }
//         history.low = {
//           usdt: CoinService.toUSDT(e.Low, cached.market, Bittrex.rate),
//           btc: CoinService.toBTC(e.Low, cached.market, Bittrex.rate),
//           eth: CoinService.toETH(e.Low, cached.market, Bittrex.rate)
//         }
//         history.high = {
//           usdt: CoinService.toUSDT(e.High, cached.market, Bittrex.rate),
//           btc: CoinService.toBTC(e.High, cached.market, Bittrex.rate),
//           eth: CoinService.toETH(e.High, cached.market, Bittrex.rate)
//         }
//         history.bid = {
//           usdt: CoinService.toUSDT(e.Bid, cached.market, Bittrex.rate),
//           btc: CoinService.toBTC(e.Bid, cached.market, Bittrex.rate),
//           eth: CoinService.toETH(e.Bid, cached.market, Bittrex.rate)
//         }
//         history.ask = {
//           usdt: CoinService.toUSDT(e.Ask, cached.market, Bittrex.rate),
//           btc: CoinService.toBTC(e.Ask, cached.market, Bittrex.rate),
//           eth: CoinService.toETH(e.Ask, cached.market, Bittrex.rate)
//         }
//         history.baseVolume = {
//           usdt: CoinService.toUSDT(e.BaseVolume, e.market, Bittrex.rate),
//           btc: e.market === 'BTC' ? e.BaseVolume : undefined,
//           eth: e.market === 'ETH' ? e.BaseVolume : undefined
//         }
//         history.volume = {
//           usdt: CoinService.toUSDT(e.Volume, e.market, Bittrex.rate),
//           btc: e.market === 'BTC' ? e.Volume : undefined,
//           eth: e.market === 'ETH' ? e.Volume : undefined
//         }
//         cached.histories = [history].concat(cached.histories)
//         cached.last = history.last
//         // AI
//         const prev = cached.histories[1]
//         if (prev) {
//           cached.buf = {
//             usdt: cached.last.usdt - prev.last.usdt,
//             percent: (cached.last.usdt - prev.last.usdt) * 100 / prev.last.usdt
//           }
//           history.prev = prev.last
//           history.buf = {
//             usdt: history.last.usdt - history.prev.usdt,
//             percent: (history.last.usdt - history.prev.usdt) * 100 / history.prev.usdt
//           }
//         }
//       }
//       // await Bittrex.redis.hset('bittrex.trace', caches)      
//       if (!Bittrex.lastUpdateDB || (Bittrex.lastUpdateDB.getMinutes() !== now.getMinutes())) { //&& now.getMinutes() % AppConfig.app.bittrex.updateDBAfterMins === 0
//         const itradings = tradings.filter(e => e.action === 'I')
//         const utradings = tradings.filter(e => e.action === 'U')
//         if (itradings && itradings.length > 0) await Bittrex.mongo.insert<BittrexTrading>(BittrexTrading, itradings)
//         if (utradings && utradings.length > 0) {
//           for (let t of utradings) {
//             await Bittrex.mongo.manual(BittrexTrading, async (collection) => {
//               await collection.update({ _id: t._id }, {
//                 $set: {
//                   buf: t.buf,
//                 },
//                 $push: {
//                   histories: {
//                     $each: [t.histories[0]],
//                     $position: 0
//                   }
//                 }
//               })
//             })
//           }
//         }
//         Bittrex.lastUpdateDB = now
//         await Bittrex.redis.set('bittrex.lastUpdateDB', Bittrex.lastUpdateDB)
//       }
//       Bittrex.coinCheckingCached = tradings
//     } catch (e) {
//       console.error(e)
//     } finally {
//       setTimeout(Bittrex.checkingMarket, AppConfig.app.bittrex.scanChecking)
//     }
//   }
// }

// export class CoinService {
//   @MONGO('coin')
//   static mongo: Mongo

//   static pushMessage(coins) {
//     axios.post('https://hooks.slack.com/services/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', {
//       text: `Have just got new coin is ${coins.join(', ')}`
//     }, {
//         headers: {
//           'content-type': 'application/json'
//         }
//       })
//   }

//   static toETH(price, market, rate) {
//     return price * (rate[`${market}-ETH`] || 1)
//   }
//   static toBTC(price, market, rate) {
//     return price * (rate[`${market}-BTC`] || 1)
//   }
//   static toUSDT(price, market, rate) {
//     return price * (rate[`${market}-USDT`] || 1)
//   }
//   static formatNumber(value) {
//     return Number(value).toLocaleString(undefined, { maximumFractionDigits: 8 })
//   }
//   static async bindCmdTelegram() {
//     const bot = new BotCommand('496750797:AAE-e3MsQXVQZsPWRtnP9-DcldnX43GgG0A') as any
//     bot.hears('help', async ({ reply }) => {
//       reply(`"rate": Show btc, eth, usdt price at current time
// "coin COIN_NAME": Show coin price at current time
// "walletid": Show the wallet IDs
// "wallet": Show the balances of wallets
// `)
//     })
//     bot.hears(/^wallet(id)?$/i, async ({ reply, message }) => {
//       const balances = await Bittrex.getMyBalances()
//       let rs
//       if (message.text.indexOf('id') !== -1) {
//         rs = balances.filter(e => e.Available).map(e => `#${e.Currency}
// ${e.CryptoAddress}`).join('\n---------------------------------------------\n')
//       } else {
//         rs = balances.filter(e => e.Available).map(e => `#${e.Currency}
// - Available: ${CoinService.formatNumber(e.Available)}
// - Total: ${CoinService.formatNumber(e.Balance)}`).join('\n---------------------------------------------\n')
//       }
//       reply(rs)
//     })
//     bot.hears('rate', ({ reply }) => reply(`1 BTC = ${CoinService.formatNumber(Bittrex.rate['BTC-USDT'])} USDT
// 1 ETH = ${CoinService.formatNumber(Bittrex.rate['ETH-USDT'])} USDT
// 1 BTC = ${CoinService.formatNumber(Bittrex.rate['BTC-ETH'])} ETH`
//     ))
//     bot.hears(/^coin .+/i, ({ reply, message }) => {
//       const coin = message.text.split(' ').filter((_e, i) => i > 0).join('').toUpperCase()
//       const txt = []
//       for (const c of Bittrex.coinCheckingCached) {
//         if (c.name === coin) {
//           if (txt.length === 0) txt.push(`#${c.name}`)
//           txt.push(`${c.market} market`)
//           if (c.name !== 'USDT') txt.push(`- ${CoinService.formatNumber(c.last.usdt)} USDT`)
//           if (c.name !== 'BTC') txt.push(`- ${CoinService.formatNumber(c.last.btc)} BTC`)
//           if (c.name !== 'ETH') txt.push(`- ${CoinService.formatNumber(c.last.eth)} ETH`)
//           txt.push(`---------------------------------------------`)
//         }
//       }
//       if (txt.length > 0) return reply(txt.join('\n'))
//       return reply('Could not found this coin')
//     })
//     bot.startPolling()
//   }
//   static async autoSync() {
//     console.log('Auto sync coin')
//     // CoinTrending.checking()
//     // Bittrex.oldCoins = JSON.parse(await Bittrex.redis.get('bittrex.currencies') as string || '[]')
//     // Bittrex.getNewCoin()
//     Bittrex.lastUpdateDB = await Bittrex.redis.get('bittrex.lastUpdateDB')
//     if (Bittrex.lastUpdateDB) {
//       Bittrex.lastUpdateDB = new Date(Bittrex.lastUpdateDB)
//       Bittrex.coinCheckingCached = await CoinService.mongo.find<BittrexTrading>(BittrexTrading, {
//         $where: {
//           updated_at: Bittrex.lastUpdateDB
//         }
//       })
//     }
//     Bittrex.checkingMarket()
//     CoinService.bindCmdTelegram()
//   }

//   static async getMarket() {
//     return Bittrex.coinCheckingCached
//   }

//   static async getRate() {
//     return Bittrex.rate
//   }

//   static async getBittrexTrading(fil) {
//     return await CoinService.mongo.find<BittrexTrading>(BittrexTrading, fil)
//   }

// }