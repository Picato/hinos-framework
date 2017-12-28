export default class BittrexApi {

  public static newestTrading = []
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

  username: string
  token: string

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

}