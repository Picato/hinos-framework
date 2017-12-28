import { Redis, REDIS } from 'hinos-redis/lib/redis';
import { BittrexCachedTrading } from './StoreTrading';
import { TelegramCommand } from './TelegramCommand';

export default class BittrexAlert {
  @REDIS()
  private static redis: Redis

  static alerts = {} as {
    [username: string]: {
      [key: string]: BittrexAlert[]
    }
  }

  constructor(public key: string, public formula: string, public des: string) { }

  // Run in StoreTrading after each updae new data
  static async checkAlert(tradings: BittrexCachedTrading[], _now: Date) {
    const alerts = BittrexAlert.alerts
    for (let username in alerts) {
      for (let key in alerts[username]) {
        const alertFormulas = alerts[username][key]
        const t = tradings.find(e => e.key === key)
        if (t) {
          const $ = t.last[t.market.toLowerCase()]
          if ($) {
            for (let i = alertFormulas.length - 1; i >= 0; i--) {
              const e = alertFormulas[i]
              let isok
              eval(`isok = $${e.formula}`)
              if (isok) {
                await TelegramCommand.BotFather.send(`${key} ${e.formula} is matched | ${e.des}`)
                await BittrexAlert.rmAlert(username, key, i)
              }
            }
          }
        }
      }
    }
  }

  static async reloadFromCached() {
    const alerts = await BittrexAlert.redis.hget(`bittrex.users.alerts`)
    for (let username in alerts) {
      if (!BittrexAlert.alerts[username]) BittrexAlert.alerts[username] = {}
      const tmp = JSON.parse(alerts[username]) as any
      for (let key in tmp) {
        if (!BittrexAlert.alerts[username][key]) BittrexAlert.alerts[username][key] = []
        BittrexAlert.alerts[username][key] = BittrexAlert.alerts[username][key].concat(tmp[key].map(e => new BittrexAlert(key, e.formula, e.des)))
      }
    }
  }

  static getAlerts(username: string) {
    return BittrexAlert.alerts[username] || []
  }

  static async rmAlert(username: string, key: string, i: number) {
    if (BittrexAlert.alerts[username] && BittrexAlert.alerts[username][key] && i < BittrexAlert.alerts[username][key].length) {
      if (i >= 0) BittrexAlert.alerts[username][key].splice(i, 1)
      else delete BittrexAlert.alerts[username][key]
      await BittrexAlert.redis.hset('bittrex.users.alerts', {
        [username]: JSON.stringify(BittrexAlert.alerts[username])
      })
    }
  }

  static async addAlert(username: string, data: BittrexAlert) {
    if (!BittrexAlert.alerts[username]) BittrexAlert.alerts[username] = {}
    if (!BittrexAlert.alerts[username][data.key]) BittrexAlert.alerts[username][data.key] = []
    BittrexAlert.alerts[username][data.key].push(data)
    await BittrexAlert.redis.hset('bittrex.users.alerts', {
      [username]: JSON.stringify(BittrexAlert.alerts[username])
    })
    return BittrexAlert.alerts[username][data.key].length - 1
  }
}
