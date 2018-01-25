import RemitanoCrawler from "../Remitano/Crawler";
import RawTrading from '../Crawler/RawHandler'

export class Cached {
  static vnd
  static rate

  static async init() {
    await Cached.reload()
  }

  static async reload() {
    Cached.vnd = await RemitanoCrawler.getRate()
    Cached.rate = await RawTrading.getRate()
  }
}