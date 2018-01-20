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
  static formatNumber(value, fm = false, digit = 8) {
    let sign = ''
    if (fm) sign = (value > 0 ? '+' : '')
    return sign + Number(value).toLocaleString(undefined, { maximumFractionDigits: digit, minimumFractionDigits: digit })
  }
  static getQuickPrice(price) {
    if (price) price = price.trim()
    let auto = false
    if (price.endsWith('$')) {
      price = price.substr(0, price.length - 1)
      auto = true
    }
    const nums = price.split('.')
    if (nums[0] === '') nums[0] = '0'
    if (auto && nums.length === 2) {
      if (nums[1].length < 8) {
        for (let i = 0, len = nums[1].length; i < 8 - len; i++) {
          nums[1] = '0' + nums[1]
        }
      }
    }
    return +BittrexApi.formatNumber(+(nums.join('.')))
  }

}