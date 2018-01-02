import { Redis, REDIS } from 'hinos-redis/lib/redis';
import { BittrexCachedTrading } from './StoreTrading';
import { TelegramCommand } from './TelegramCommand';
import BittrexApi from './BittrexApi';
import BittrexUser from './BittrexUser';

export default class BittrexAlert {
  @REDIS()
  private static redis: Redis

  // static GROUP_ID = 504722063

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
          const $ = t.last
          if ($) {
            for (let i = alertFormulas.length - 1; i >= 0; i--) {
              const e = alertFormulas[i]
              let isok
              const user = BittrexUser.users[username]
              if (user) {
                try {
                  eval(`isok = $ ${e.formula}`)
                  if (isok) {
                    const msgs = [`📣📣📣 *${key}* = *${BittrexApi.formatNumber(t.last)}* ${e.formula} 📣📣📣`]
                    if (e.des) msgs.push(`_${e.des}_`)
                    await TelegramCommand.Bot.send(user.chatId, `${msgs.join('\n')}`, { parse_mode: 'Markdown' })
                    await BittrexAlert.rmAlert(username, key, i)
                  }
                } catch (_e) {
                  await TelegramCommand.Bot.send(user.chatId, `Formula *${e.formula}* got problem`, { parse_mode: 'Markdown' })
                }
              }
            }
          }
        }
      }
    }
  }

  static async checkOrder() {
    for (const username in BittrexUser.users) {
      const user = BittrexUser.users[username]
      const orderIds = user.orderIds
      if (user.orderIds.length > 0) {
        for (let i = orderIds.length - 1; i >= 0; i--) {
          const { orderId, chatId, messageId } = orderIds[i]
          const od = await user.getOrder(orderId)
          if (!od.IsOpen) {
            try {
              if (od.CancelInitiated) {
                // User Canceled
                await TelegramCommand.Bot.editMessageText(chatId, messageId, undefined, '🚫 The order was canceled by another', { parse_mode: 'Markdown' })
              } else {
                // Success
                await TelegramCommand.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                  inline_keyboard: [[{ text: 'THIS ORDER HAS DONE 👍', url: 'https://bittrex.com/History' }]]
                })
              }
            } catch (e) {
              console.error('Got problem in checkOrder', e)
            } finally {
              await user.removeOrder(orderId)
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
    if (BittrexAlert.alerts[username]) {
      if (!key) {
        BittrexAlert.alerts[username] = {}
        await BittrexAlert.redis.hset('bittrex.users.alerts', {
          [username]: JSON.stringify(BittrexAlert.alerts[username])
        })
      } else if (BittrexAlert.alerts[username][key] && i < BittrexAlert.alerts[username][key].length) {
        if (i >= 0) BittrexAlert.alerts[username][key].splice(i, 1)
        else delete BittrexAlert.alerts[username][key]
        await BittrexAlert.redis.hset('bittrex.users.alerts', {
          [username]: JSON.stringify(BittrexAlert.alerts[username])
        })
      }
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
