import RemitanoCrawler from "../Remitano/Crawler";
import RawTrading, { TradingTemp } from '../Crawler/RawHandler'
import BittrexUser from "./BittrexUser";
import RawHandler from "../Crawler/RawHandler";

export class Cached {
  static vnd
  static rate
  static balances = {} as any
  static tradings = undefined as TradingTemp[]

  static async init() {
    await Cached.reload()
  }

  static async reload() {
    Cached.tradings = await RawHandler.getTradings()
    Cached.vnd = await RemitanoCrawler.getRate()
    Cached.rate = await RawTrading.getRate()
    const users = await BittrexUser.getAll()
    for (let username in users) {
      Cached.balances[username] = await users[username].getMyBalances()
    }
  }
}