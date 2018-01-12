import { Redis } from 'hinos-redis/lib/redis';
import BittrexVNBot from '../Telegram/BittrexVNBot';
import BittrexApi from './BittrexApi';
import BittrexUser from './BittrexUser';

export default class BittrexOrderAlertChecking {

  // Run in RawTrading after each updae new data
  static async checkAlert() {
    console.log('#TELEGRAM_BOT', 'CHECK ALERT')
    Redis.subscribe('updateData', async (data) => {
      let tradings
      // check bot order
      for (let username in BittrexUser.users) {
        const user = BittrexUser.users[username]
        for (let o of user.botOrders) {
          if (!tradings) tradings = JSON.parse(data).tradings
          const t = tradings.find(e => e.key === o.key)
          if (t) {
            const { key, quantity, price, action, chatId, messageId, type } = o
            if (o.canBeOrder(t.last)) {
              const rs = {} as any
              if (action === 'sell') {
                await BittrexVNBot.Bot.send(chatId, `Selled ${+quantity} ${key} with price ${+t.last}/${price} type is ${type}`)
                // const rs = await user.sell(key, +quantity, +t.last, type) as any
                // await user.addOrder(rs.OrderId, chatId, messageId)

                await BittrexVNBot.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                  inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
                })
              } else {
                await BittrexVNBot.Bot.send(chatId, `Bought ${+quantity} ${key} with price ${+t.last}/${price} type is ${type}`)
                // const rs = await user.buy(key, +quantity, +t.last, type) as any
                // await user.addOrder(rs.OrderId, chatId, messageId)

                await BittrexVNBot.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                  inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
                })
              }
              user.botCancel(o._id)
            } else if (o.changedLimit) {
              o.changedLimit = false
              await BittrexVNBot.Bot.send(chatId, `[${action.toUpperCase()}] Bot is holding ${+quantity} ${key} with price ${BittrexApi.formatNumber(t.last)} (${BittrexApi.formatNumber(t.last - price)} = ${BittrexApi.formatNumber((t.last - price) * quantity)})`)
            }
          }
        }
        // Check bot alert
        for (let key in user.alerts) {
          const alertFormulas = user.alerts[key]
          if (!tradings) tradings = JSON.parse(data).tradings
          const t = tradings.find(e => e.key === key)
          if (t) {
            const $ = t.last
            if ($) {
              for (let i = alertFormulas.length - 1; i >= 0; i--) {
                const e = alertFormulas[i]
                let isok
                try {
                  eval(`isok = $ ${e.formula}`)
                  if (isok) {
                    const msgs = [`📣📣📣 [${key}](https://bittrex.com/Market/Index?MarketName=${key}) = *${BittrexApi.formatNumber(t.last)}* ${e.formula} 📣📣📣`]
                    if (e.des) msgs.push(`_${e.des}_`)
                    await BittrexVNBot.Bot.send(user.chatId, `${msgs.join('\n')}`, { parse_mode: 'Markdown' })
                    await user.rmAlert(key, i)
                  }
                } catch (_e) {
                  await BittrexVNBot.Bot.send(user.chatId, `Formula *${e.formula}* got problem`, { parse_mode: 'Markdown' })
                }
              }
            }
          }
        }
      }
    }, AppConfig.redis)
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
                await BittrexVNBot.Bot.editMessageText(chatId, messageId, undefined, `🚫 Order [${od.Exchange}](https://bittrex.com/Market/Index?MarketName=${od.Exchange}) ${od.Type === 'LIMIT_BUY' ? 'buy' : 'sell'} *${od.Quantity}* statoshi with price *${od.Limit}* was canceled by another`, { parse_mode: 'Markdown' })
              } else {
                // Success
                if (od.ImmediateOrCancel && od.Quantity === od.QuantityRemaining) {
                  await BittrexVNBot.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                    inline_keyboard: [[{ text: 'THIS ORDER IS MISSED 💢', url: 'https://bittrex.com/History' }]]
                  })
                } else {
                  await BittrexVNBot.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                    inline_keyboard: [[{ text: 'THIS ORDER HAS DONE 👍', url: 'https://bittrex.com/History' }]]
                  })
                }
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
    setTimeout(BittrexOrderAlertChecking.checkOrder, 5000)
  }

  static async reloadFromCached() {
    await BittrexUser.reloadFromCached()
  }


}
