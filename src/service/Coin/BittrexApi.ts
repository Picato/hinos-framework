import * as bittrex from 'node-bittrex-api'

bittrex.options({
  apikey: AppConfig.app.bittrex.apikey,
  apisecret: AppConfig.app.bittrex.apisecret,
  inverse_callback_arguments: true
})

export default class BittrexApi {

  public static newestTrading
  public static rate = {
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
}