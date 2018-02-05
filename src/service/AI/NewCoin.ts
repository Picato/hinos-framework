import * as _ from 'lodash'
import * as Extra from 'telegraf/extra'
import { REDIS, Redis } from "hinos-redis/lib/redis";
import { TradingTemp } from '../Crawler/RawHandler';
import { User } from '../User';
import AlertCommand from '../Telegram/AlertCommand';
import { TRACE, TRACER } from 'hinos-log/lib/tracer';

export class NewCoin {
  @REDIS()
  static redis: Redis

  static async init() {

  }

  @TRACE({ type: TRACER.EXECUTE_TIME })
  static async handleNewCoin(oldTradings: TradingTemp[], newTradings: any[]) {
    const newCoins = _.differenceWith(newTradings, oldTradings, (a, b) => a.MarketName === b.key)
    let msgs = []
    if (newCoins.length > 0) {
      msgs = msgs.concat(newCoins.map(e => `🍃 [${e.key}](https://bittrex.com/Market/Index?MarketName=${e.key})`))
    }
    const oldCoins = _.differenceWith(oldTradings, newTradings, (a, b) => b.MarketName === a.key)
    if (oldCoins.length > 0) {
      msgs = msgs.concat(oldCoins.map(e => `🍂 [${e.key}](https://bittrex.com/Market/Index?MarketName=${e.key})`))
    }
    if (msgs.length > 0) {
      msgs.splice(0, 0, `-------------------------------`)
      msgs.splice(0, 0, `CHANGING COINS 🌱`)
      for (let u of User.users) {
        if (u.globalAlertId) {
          try {
            await AlertCommand.Bot.telegram.sendMessage(u.globalAlertId, msgs.join('\n'), Extra.markdown())
          } catch (e) {
            await AlertCommand.Bot.telegram.sendMessage(u.globalAlertId, e.message)
          }
        }
      }
    }
  }

}