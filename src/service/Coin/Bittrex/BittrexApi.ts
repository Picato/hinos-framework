export default class BittrexApi {

  static toETH(price, market, rate) {
    return price * (rate[`${market}-ETH`] || 1)
  }
  static toBTC(price, market, rate) {
    return price * (rate[`${market}-BTC`] || 1)
  }
  static toUSDT(price, market, rate) {
    return price * (rate[`${market}-USDT`] || 1)
  }
  static formatNumber(value, fm = false) {
    let sign = ''
    if (fm) sign = (value > 0 ? '+' : '')
    return sign + Number(value).toLocaleString(undefined, { maximumFractionDigits: 8, minimumFractionDigits: 8 })
  }

}