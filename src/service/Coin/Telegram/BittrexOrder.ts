import { Redis } from 'hinos-redis/lib/redis';
import BittrexApi from './BittrexApi';
import BittrexUser from './BittrexUser';
import * as Extra from 'telegraf/extra'
import RawTrading from '../Crawler/RawHandler'
import { BotCommand } from './Telegram';

export default class BittrexOrder {
  static Bot = new BotCommand(AppConfig.app.telegram.OrderBot)

  static async init() {
    BittrexOrder.initCommand()
    console.log('#TELEGRAM_BOT', 'CHECK Order')
    await BittrexOrder.checkOrder()
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
            t.last = action === 'sell' ? t.ask : t.bid
            if (o.canBeOrder(t.last)) {
              const rs = {} as any
              if (action === 'sell') {
                await BittrexOrder.Bot.send(chatId, `Selled ${+quantity} ${key} with price ${+t.last}/${price} type is ${type}`)
                // const rs = await user.sell(key, +quantity, +t.last, type) as any
                // await user.addOrder(rs.OrderId, chatId, messageId)

                await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                  inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
                })
              } else {
                await BittrexOrder.Bot.send(chatId, `Bought ${+quantity} ${key} with price ${+t.last}/${price} type is ${type}`)
                // const rs = await user.buy(key, +quantity, +t.last, type) as any
                // await user.addOrder(rs.OrderId, chatId, messageId)

                await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                  inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
                })
              }
              await user.botCancel(o._id)
            } else if (o.changedLimit) {
              o.changedLimit = false
              await BittrexOrder.Bot.send(chatId, `[${action.toUpperCase()}] Bot is holding ${+quantity} ${key} with price ${BittrexApi.formatNumber(t.last)} (${BittrexApi.formatNumber(t.last - price)} = ${BittrexApi.formatNumber((t.last - price) * quantity)})`)
            }
          }
        }
      }
    }, AppConfig.redis)
  }

  private static initCommand() {
    BittrexOrder.registerBuy()
    BittrexOrder.registerSell()
    BittrexOrder.registerMyOrders()
    BittrexOrder.Bot.startPolling()
  }

  private static async formatBuyForm(key, quantity, price, subTotal, commission, w, wbuy, isCheckWallet, bufferRate?) {
    const [market, coin] = key.split('-')
    const total = +(subTotal + commission).toFixed(8)
    const newestTrading = await RawTrading.getTradings()
    const trading = newestTrading.find(e => e.key === key)
    if (!trading) throw `Could not found price of "${key}"`

    const msgs = []
    msgs.push(`*BUYING FORM DETAILS*`)
    msgs.push(`----------------------------------------------`)
    msgs.push(`*Market*              [${key}](https://bittrex.com/Market/Index?MarketName=${key})`)
    msgs.push(`*Quantity*         *+${BittrexApi.formatNumber(quantity)}* ${coin}`)
    msgs.push(`                      🚀 _${BittrexApi.formatNumber(trading.last)} ${market}_ 🚀`)
    if (bufferRate) msgs.push(`               _Buffer: ${BittrexApi.formatNumber(bufferRate)}_`)
    msgs.push(`*Price*                   *${BittrexApi.formatNumber(price)}* ${market}`)
    msgs.push(`*Total*                 *-${BittrexApi.formatNumber(total)}* ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Your balances 💰*`)
      if (isCheckWallet) {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wbuy.Available)} 🔜 *${BittrexApi.formatNumber(wbuy.Available + quantity)}*`)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available - total)}*`)
        if (w.Available < total) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (price > trading.last) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price is greater than last price ? 😱_')
        }
      } else {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wbuy.Available)} 🔜 *${BittrexApi.formatNumber(wbuy.Available + quantity)}*`)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available + total)} 🔜 *${BittrexApi.formatNumber(w.Available)}*`)
      }
      msgs.push(`----------------------------------------------`)
    }
    return { msgs, isOk }
  }

  private static async formatSellForm(key, quantity, price, subTotal, commission, w, wsell, isCheckWallet, bufferRate?) {
    const [market, coin] = key.split('-')
    const total = +(subTotal - commission).toFixed(8)
    const newestTrading = await RawTrading.getTradings()
    const trading = newestTrading.find(e => e.key === key)
    if (!trading) throw `Could not found price of "${key}"`

    const msgs = []
    msgs.push(`*SELLING FORM DETAILS*`)
    msgs.push(`----------------------------------------------`)
    msgs.push(`*Market*              [${key}](https://bittrex.com/Market/Index?MarketName=${key})`)
    msgs.push(`*Quantity*          *-${BittrexApi.formatNumber(quantity)}* ${coin}`)
    msgs.push(`                      🚀 _${BittrexApi.formatNumber(trading.last)} ${market}_ 🚀`)
    if (bufferRate) msgs.push(`               _Buffer: ${BittrexApi.formatNumber(bufferRate)}_`)
    msgs.push(`*Price*                   *${BittrexApi.formatNumber(price)}* ${market}`)
    msgs.push(`*Total*                *+${BittrexApi.formatNumber(total)}* ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Your balances 💰*`)
      if (isCheckWallet) {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wsell.Available)} 🔜 *${BittrexApi.formatNumber(wsell.Available - quantity)}*`)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available + total)}*`)
        if (wsell.Available < quantity) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (price < trading.last) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price is greater than last price ? 😱_')
        }
      } else {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wsell.Available + quantity)} 🔜 *${BittrexApi.formatNumber(wsell.Available)}*`)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available + total)}*`)
      }
      msgs.push(`----------------------------------------------`)
    }
    return { msgs, isOk }
  }

  private static registerBuy() {
    BittrexOrder.Bot.action(/buy:(yes|no|bot) .+/, async (ctx) => {
      const { editMessageText, editMessageReplyMarkup, reply, match, from, chat, callbackQuery } = ctx
      try {
        const [action, ...prms] = match[0].split(' ')
        if (action === 'buy:yes') {
          const [key, quantity, price, type] = prms
          if (key && quantity && price) {
            const user = BittrexUser.users[from.id.toString()]
            if (!user) throw new Error('User has not login yet')

            const rs = await user.buy(key, +quantity, +price, BittrexUser.ORDER_TYPE[+type]) as any
            await user.addOrder(rs.OrderId, chat.id, callbackQuery.message.message_id)

            return await editMessageReplyMarkup({
              inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
            })
          }
          await reply('Market, quantity, price is required')
        } else if (action === 'buy:bot') {
          const [key, quantity, price, , bufferRate] = prms
          if (key && quantity && price) {
            const user = BittrexUser.users[from.id.toString()]
            if (!user) throw new Error('User has not login yet')

            const rs = await user.botBuy(key, +quantity, +price, +bufferRate, chat.id, callbackQuery.message.message_id) as any

            return await editMessageReplyMarkup({
              inline_keyboard: [[{ text: '🚫 CANCEL THIS BOT ORDER', callback_data: `order:botcancel ${rs._id}` }]]
            })
          }
          await reply('Market, quantity, price is required')
        } else {
          const [key, quantity, price] = prms
          await editMessageText(`🚫 Canceled order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) buy *${quantity}* coins with price *${price}*`, Extra.markdown())
        }
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexOrder.Bot.command('buy', async (ctx) => {
      const { reply, message, from, replyWithMarkdown } = ctx
      try {
        const user = BittrexUser.users[from.id.toString()]
        if (!user) return reply('User not login yet')
        let [, key, quantity, price, bufferRate] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        price = BittrexApi.getQuickPrice(price)
        const [market, coin] = key.split('-')
        const rate = 0.0025
        const balances = await user.getMyBalances()
        const w = balances.find(e => e.Currency === market)
        const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
        quantity = quantity === 'all' ? (w.Available / (price + (rate * price))) : +quantity
        quantity = +quantity.toFixed(8)

        const subTotal = +(quantity * price).toFixed(8)
        const commission = +(subTotal * rate).toFixed(8)

        const { msgs, isOk } = await BittrexOrder.formatBuyForm(key, quantity, price, subTotal, commission, w, wbuy, true, bufferRate)

        if (!bufferRate) bufferRate = 0
        else bufferRate = +bufferRate
        if (isNaN(bufferRate)) bufferRate = 0
        await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
          m.callbackButton('✅ BID', `buy:yes ${key} ${quantity} ${price} 1`),
          m.callbackButton('🚀 IMMEDIATE', `buy:yes ${key} ${quantity} ${price} 0`),
          m.callbackButton('👻 BOT', `buy:bot ${key} ${quantity} ${price} 0 ${bufferRate}`),
          m.callbackButton('🚫 CANCEL', `buy:no ${key} ${quantity} ${price}`),
        ]))
        )
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static registerSell() {
    BittrexOrder.Bot.action(/sell:(yes|no|bot) .+/, async (ctx) => {
      const { editMessageText, editMessageReplyMarkup, reply, match, from, chat, callbackQuery } = ctx
      try {
        const [action, ...prms] = match[0].split(' ')
        if (action === 'sell:yes') {
          const [key, quantity, price, type] = prms
          if (key && quantity && price) {
            const user = BittrexUser.users[from.id.toString()]
            if (!user) throw new Error('User has not login yet')

            const rs = await user.sell(key, +quantity, +price, BittrexUser.ORDER_TYPE[+type]) as any
            await user.addOrder(rs.OrderId, chat.id, callbackQuery.message.message_id)

            return await editMessageReplyMarkup({
              inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
            })
          }
          await reply('Market, quantity, price is required')
        } else if (action === 'sell:bot') {
          const [key, quantity, price, , bufferRate] = prms
          if (key && quantity && price) {
            const user = BittrexUser.users[from.id.toString()]
            if (!user) throw new Error('User has not login yet')

            const rs = await user.botSell(key, +quantity, +price, +bufferRate, chat.id, callbackQuery.message.message_id) as any

            return await editMessageReplyMarkup({
              inline_keyboard: [[{ text: '🚫 CANCEL THIS BOT ORDER', callback_data: `order:botcancel ${rs._id}` }]]
            })
          }
          await reply('Market, quantity, price is required')
        } else {
          const [key, quantity, price] = prms
          await editMessageText(`🚫 Canceled order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) buy *${quantity}* coins with price *${price}*`, Extra.markdown())
        }
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexOrder.Bot.command('sell', async (ctx) => {
      const { reply, message, from, replyWithMarkdown } = ctx
      try {
        const user = BittrexUser.users[from.id.toString()]
        if (!user) return reply('User not login yet')
        let [, key, quantity, price, bufferRate] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        price = BittrexApi.getQuickPrice(price)
        const [market, coin] = key.split('-')
        const rate = 0.0025
        const balances = await user.getMyBalances()
        const w = balances.find(e => e.Currency === market)
        const wsell = balances.find(e => e.Currency === coin)
        quantity = quantity === 'all' ? wsell.Available : +quantity
        quantity = +quantity.toFixed(8)

        const subTotal = +(quantity * price).toFixed(8)
        const commission = +(subTotal * rate).toFixed(8)

        const { msgs, isOk } = await BittrexOrder.formatSellForm(key, quantity, price, subTotal, commission, w, wsell, true, bufferRate)

        if (!bufferRate) bufferRate = 0
        else bufferRate = +bufferRate
        if (isNaN(bufferRate)) bufferRate = 0
        await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
          m.callbackButton('✅ BID', `sell:yes ${key} ${quantity} ${price} 1`),
          m.callbackButton('🚀 IMMEDIATE', `sell:yes ${key} ${quantity} ${price} 0`),
          m.callbackButton('👻 BOT', `sell:bot ${key} ${quantity} ${price} 0 ${bufferRate}`),
          m.callbackButton('🚫 CANCEL', `sell:no ${key} ${quantity} ${price}`),
        ]))
        )
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static async registerMyOrders() {
    BittrexOrder.Bot.action(/order:(cancel|botcancel) .+/, async (ctx) => {
      const { editMessageText, match, from } = ctx
      try {
        const [action, orderId] = match[0].split(' ')

        const user = BittrexUser.users[from.id.toString()]
        if (!user) throw new Error('User has not login yet')

        if (action === 'order:cancel') {
          await user.cancel(orderId)
          await user.removeOrder(orderId)
        } else {
          user.botCancel(orderId)
        }

        await editMessageText(`🚫 Canceled the order`)
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexOrder.Bot.command('order', async (ctx) => {
      const { replyWithMarkdown, from, reply } = ctx
      try {
        const user = BittrexUser.users[from.id.toString()]
        if (!user) return reply('User not login yet')
        const orders = await user.getMyOrders()
        if (orders.length === 0 && user.botOrders.length === 0) return await reply('Have no any order')
        const balances = await user.getMyBalances()
        const rate = 0.0025
        for (let o of orders) {
          const key = o.Exchange
          const price = o.Limit
          const quantity = o.Quantity
          const [market, coin] = key.split('-')
          const w = balances.find(e => e.Currency === market)
          const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
          const subTotal = +(quantity * price).toFixed(8)
          const commission = +(subTotal * rate).toFixed(8)

          const { msgs, isOk } = o.OrderType === 'LIMIT_BUY' ? await BittrexOrder.formatBuyForm(key, quantity, price, subTotal, commission, w, wbuy, false) : await BittrexOrder.formatSellForm(key, quantity, price, subTotal, commission, w, wbuy, false)
          const m = await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
            m.callbackButton('🚫 CANCEL THIS ORDER', `order:cancel ${o.OrderUuid}`),
          ])))
          await user.addOrder(o.OrderUuid, m.chat.id, m.message_id)
        }
        for (let o of user.botOrders) {
          const key = o.key
          const price = o.price
          const quantity = o.quantity
          const [market, coin] = key.split('-')
          const w = balances.find(e => e.Currency === market)
          const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
          const subTotal = +(quantity * price).toFixed(8)
          const commission = +(subTotal * rate).toFixed(8)
          const bufferRate = o.rate

          const { msgs, isOk } = o.action === 'buy' ? await BittrexOrder.formatBuyForm(key, quantity, price, subTotal, commission, w, wbuy, false, bufferRate) : await BittrexOrder.formatSellForm(key, quantity, price, subTotal, commission, w, wbuy, false, bufferRate)
          await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
            m.callbackButton('🚫 CANCEL THIS BOT ORDER', `order:botcancel ${o._id}`)
          ])))
        }
      } catch (e) {
        await reply(e.message || e)
      }
    })
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
                await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Order [${od.Exchange}](https://bittrex.com/Market/Index?MarketName=${od.Exchange}) ${od.Type === 'LIMIT_BUY' ? 'buy' : 'sell'} *${od.Quantity}* statoshi with price *${od.Limit}* was canceled by another`, { parse_mode: 'Markdown' })
              } else {
                // Success
                if (od.ImmediateOrCancel && od.Quantity === od.QuantityRemaining) {
                  await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                    inline_keyboard: [[{ text: 'THIS ORDER IS MISSED 💢', url: 'https://bittrex.com/History' }]]
                  })
                } else {
                  await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
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
    setTimeout(BittrexOrder.checkOrder, 5000)
  }
}
