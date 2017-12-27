import { REDIS, Redis } from "hinos-redis/lib/redis";
import { BittrexCachedTrading } from "./StoreTrading";
import { TelegramCommand } from "./TelegramCommand";

export class Notification {
  @REDIS()
  private static redis: Redis

  static tracing = {}

  static async init() {
    const old = await Notification.redis.hget('bittrex.notify')
    if (old) {
      for (let k in old) {
        old[k] = JSON.parse(old[k])
      }
      Notification.tracing = old
    } else {
      Notification.tracing = {}
    }
  }

  static get(key?: string) {
    return key ? Notification.tracing[key] : Notification.tracing
  }

  static async save(key, matrix) {
    if (!Notification.tracing[key]) Notification.tracing[key] = []
    Notification.tracing[key].push(matrix)
    await Notification.redis.hset('bittrex.notify', {
      [key]: JSON.stringify(Notification.tracing[key])
    })
  }

  static async remove(key, index) {
    Notification.tracing[key].splice(index, 1)
    if (Notification.tracing[key].length > 0) {
      await Notification.redis.hset('bittrex.notify', {
        [key]: JSON.stringify(Notification.tracing[key])
      })
    } else {
      await Notification.redis.hdel('bittrex.notify', [key])
      delete Notification.tracing[key]
    }
  }

  static async checkNotification(tradings: BittrexCachedTrading[], now: Date) {
    const tracing = Notification.tracing
    for (let key in tracing) {
      const t = tradings.find(e => e.key === key)
      if (t) {
        const $ = t.last[t.market.toLowerCase()]
        if ($) {
          for (let i = tracing[key].length - 1; i >= 0; i--) {
            const e = tracing[key][i]
            let isok
            eval(`isok = $${e}`)
            if (isok) {
              await TelegramCommand.Bot.send(`"${key} ${e}" is matched`)
              await Notification.remove(key, i)
            }
          }
        }
      }
    }
  }

}