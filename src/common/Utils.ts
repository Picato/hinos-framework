import * as path from 'path'
import * as fs from 'fs'
import { ImageResize } from 'hinos-bodyparser/file'

export default class Utils {

  static readonly Markets = ['BTC', 'USDT', 'ETH']

  static getQuickCoin(coin: string) {
    coin = coin.toUpperCase()
    const e = Utils.Markets.find(e => coin.startsWith(`${e}-`))
    if (!e) {
      Utils.Markets.forEach(e => {
        coin = coin.replace(new RegExp(`^${e}`), `${e}-`)
      })
    }
    return coin
  }

  static getQuickPrice(price) {
    if (price) price = price.trim()
    if (price.indexOf('.') !== 0) return +price
    const nums = `0${price}`.split('.')
    if (nums.length === 2) {
      if (nums[1].length < 8) {
        for (let i = 0, len = nums[1].length; i < 8 - len; i++) {
          nums[1] = '0' + nums[1]
        }
      }
    }
    return +(nums.join('.'))
  }

  static toFixNum(num: number, fixed = 8) {
    return +num.toFixed(fixed)
  }

  static formatNumber(value, fm = false, digit = 8) {
    let sign = ''
    if (fm) sign = (value > 0 ? '+' : '')
    // if (value % 1 === 0) digit = 0
    return sign + Number(value).toLocaleString(undefined, { maximumFractionDigits: digit, minimumFractionDigits: digit })
  }

  public static getUploadFile(assetPath: string) {
    return Utils.getAssetPath(assetPath)
  }

  public static deleteUploadFiles(files: string | string[], sizes?: ImageResize[]): void {
    if (!files) return
    const remove = (f: string, sizes?: ImageResize[]) => {
      try {
        fs.statSync(f)
        fs.unlinkSync(f)
      } catch (e) { /*File was removed before that*/ }
      if (sizes) {
        for (let s of sizes) {
          if (s.ext) remove(f.substr(0, f.lastIndexOf('.') + 1) + s.ext + f.substr(f.lastIndexOf('.')))
        }
      }
    }
    if (!(files instanceof Array)) return remove(Utils.getAssetPath(files.split('?')[0]) as string, sizes)
    for (let f of files) {
      remove(Utils.getAssetPath(f.split('?')[0]) as string, sizes)
    }
  }

  private static getAssetPath(paths: string | string[]) {
    if (paths instanceof Array) return paths.map(e => path.join(e.indexOf('assets') === 0 ? '' : 'assets', e))
    if (paths.indexOf('assets') === 0) return paths
    return path.join('assets', paths)
  }

}
