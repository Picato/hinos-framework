import { REDIS, Redis } from 'hinos-redis/lib/redis';
import BittrexApi from './BittrexApi';
import BittrexUser from './BittrexUser';
import * as Extra from 'telegraf/extra'
import { TradingTemp } from '../Crawler/RawHandler'
import { BotCommand } from './Telegram';

export default class BittrexOrder {
  static readonly Status = {
    WAITING: 0,
    CANCELED: -1,
    DONE: 2
  }
  static readonly Type = {
    BUY: -1,
    SELL: 1
  }
  static readonly ORDER_TYPE = ['IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL']

  static Bot = new BotCommand(AppConfig.app.telegram.OrderBot)

  @REDIS()
  private static redis: Redis

  static orders = {} as { [key: string]: BittrexOrder[] }

  public orderId

  constructor(public _id = BittrexApi.getId(), public user, public chatId, public messageId, public key: string, public quantity: number, public price: number, public subTotal: number, public commission: number, public bufferRate: number, public type: number, public status: number) {

  }

  static async init() {
    BittrexOrder.initCommand()
    console.log('#TELEGRAM_BOT', 'CHECK Order')
    // await BittrexOrder.checkOrder()
    let als = await BittrexOrder.redis.hget(`bittrex.orders`)
    if (als) {
      for (let k in als) {
        for (const { key, user, chatId, messageId, quantity, price, subTotal, commission, bufferRate, _id, status, type } of JSON.parse(als[k])) {
          await BittrexOrder.add(_id, user, chatId, messageId, key, quantity, price, subTotal, commission, bufferRate, type, status)
        }
      }
    }
    Redis.subscribe('updateData', async (data) => {
      const { tradings } = JSON.parse(data)
      await BittrexOrder.update(tradings)
      // check bot order
      // for (let username in BittrexUser.users) {
      //   const user = BittrexUser.users[username]
      //   for (let o of user.botOrders) {
      //     const t = tradings.find(e => e.key === o.key)
      //     if (t) {
      //       const { key, quantity, price, action, chatId, messageId, type } = o
      //       t.last = action === 'sell' ? t.ask : t.bid
      //       if (o.canBeOrder(t.last)) {
      //         const rs = {} as any
      //         if (action === 'sell') {
      //           await BittrexOrder.Bot.send(chatId, `Selled ${+quantity} ${key} with price ${+t.last}/${price} type is ${type}`)
      //           // const rs = await user.sell(key, +quantity, +t.last, type) as any
      //           // await user.addOrder(rs.OrderId, chatId, messageId)

      //           await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
      //             inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
      //           })
      //         } else {
      //           await BittrexOrder.Bot.send(chatId, `Bought ${+quantity} ${key} with price ${+t.last}/${price} type is ${type}`)
      //           // const rs = await user.buy(key, +quantity, +t.last, type) as any
      //           // await user.addOrder(rs.OrderId, chatId, messageId)

      //           await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
      //             inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
      //           })
      //         }
      //         await user.botCancel(o._id)
      //       } else if (o.changedLimit) {
      //         o.changedLimit = false
      //         await BittrexOrder.Bot.send(chatId, `[${action.toUpperCase()}] Bot is holding ${+quantity} ${key} with price ${BittrexApi.formatNumber(t.last)} (${BittrexApi.formatNumber(t.last - price)} = ${BittrexApi.formatNumber((t.last - price) * quantity)})`)
      //       }
      //     }
      //   }
      // }
    }, AppConfig.redis)
  }

  private static async update(tradings: TradingTemp[]) {
    const orders = BittrexOrder.orders
    for (let k in orders) {
      const t = tradings.find(e => e.key === k)
      for (let i = orders[k].length - 1; i >= 0; i--) {
        const od = orders[k][i]
        const { key, user, chatId, messageId, quantity, price, subTotal, commission, bufferRate, _id, status, type } = od
        if (status === BittrexOrder.Status.CANCELED) {
          await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Canceled order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) buy *${quantity}* coins with price *${price}*`, Extra.markdown())
          await BittrexOrder.remove(key, _id)
          break
        } else if (status === BittrexOrder.Status.DONE) {
          await BittrexOrder.Bot.send(chatId, `Bought ${quantity} ${key} with price ${price} type is ${BittrexOrder.ORDER_TYPE[type]}`)
          await BittrexOrder.remove(key, _id)
          break
        } else if (status === BittrexOrder.Status.WAITING) {
          const usr = BittrexUser.users[user]
          const balances = await usr.getMyBalances()
          const [market, coin] = key.split('-')
          const w = balances.find(e => e.Currency === market)
          const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
          let msgs
          if (type === BittrexOrder.Type.BUY) {
            const rs = await BittrexOrder.formatBuyForm(t, key, quantity, price, subTotal, commission, w, wbuy, undefined, false, bufferRate)
            msgs = rs.msgs
          } else {
            const rs = await BittrexOrder.formatSellForm(t, key, quantity, price, subTotal, commission, w, wbuy, undefined, false, bufferRate)
            msgs = rs.msgs
          }
          await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([
            m.callbackButton('🚫 CANCEL', `order:cancel ${key} ${_id}`),
          ])))
        } else {
          const usr = BittrexUser.users[user]
          const balances = await usr.getMyBalances()
          const [market, coin] = key.split('-')
          const w = balances.find(e => e.Currency === market)
          const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
          let msgs, isOk
          if (type === BittrexOrder.Type.BUY) {
            const rs = await BittrexOrder.formatBuyForm(t, key, quantity, price, subTotal, commission, w, wbuy, undefined, true, bufferRate)
            msgs = rs.msgs
            isOk = rs.isOk
          } else {
            const rs = await BittrexOrder.formatSellForm(t, key, quantity, price, subTotal, commission, w, wbuy, undefined, true, bufferRate)
            msgs = rs.msgs
            isOk = rs.isOk
          }
          await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
            m.callbackButton('✅ BID', `buy:yes ${key} ${_id} 1`),
            m.callbackButton('🚀 IMMEDIATE', `buy:yes ${key} ${_id} 0`),
            m.callbackButton('👻 BOT', `buy:bot ${key} ${_id} 0`),
            m.callbackButton('🚫 CANCEL', `buy:no ${key} ${_id}`),
          ])))
        }
      }
    }
  }

  private static initCommand() {
    BittrexOrder.registerBuy()
    BittrexOrder.registerSell()
    BittrexOrder.registerMyOrders()
    BittrexOrder.Bot.startPolling()
  }

  static async remove(key, id) {
    let od
    if (id === undefined) {
      for (let od of BittrexOrder.orders[key]) {
        await BittrexOrder.Bot.deleteMessage(od.chatId, od.messageId)
      }
      od = BittrexOrder.orders[key] = []
    } else {
      const idx = BittrexOrder.orders[key].findIndex(e => e._id === id)
      od = BittrexOrder.orders[key]
      await BittrexOrder.Bot.deleteMessage(od.chatId, od.messageId)
      od.splice(idx, 1)
    }
    await BittrexOrder.save(key)
  }

  static async add(_id, user, chatId, messageId, key, quantity, price, subTotal, commission, bufferRate, type, status) {
    const b = new BittrexOrder(_id, user, chatId, messageId, key, quantity, price, subTotal, commission, bufferRate, type, status)
    if (!BittrexOrder.orders[key]) BittrexOrder.orders[key] = []
    BittrexOrder.orders[key].push(b)
    BittrexOrder.save(key)
    return b
  }

  static async get(key, _id) {
    if (!BittrexOrder.orders[key]) BittrexOrder.orders[key] = []
    return BittrexOrder.orders[key].find(e => e._id === _id)
  }

  static async save(key) {
    await BittrexOrder.redis.hset(`bittrex.orders`, {
      [key]: JSON.stringify(BittrexOrder.orders[key])
    })
  }

  private static async formatBuyForm(t: TradingTemp, key, quantity, price, subTotal, commission, w, wbuy, status, isCheckWallet, bufferRate?) {
    const [market, coin] = key.split('-')
    const total = +(subTotal + commission).toFixed(8)

    const msgs = []
    msgs.push(`BUYING FORM at *${new Date().toTimeString().split(' ')[0]}*`)
    // _${status === undefined ? '' : (status === BittrexOrder.Status.WAITING ? 'Waiting' : (status === BittrexOrder.Status.DONE ? 'Done' : 'Canceled'))}_
    msgs.push(`----------------------------------------------`)
    msgs.push(`*Market*               [${key}](https://bittrex.com/Market/Index?MarketName=${key})`)
    msgs.push(`                      🚀 ${BittrexApi.formatNumber(t.last)} ${market} 🚀`)
    if (bufferRate) msgs.push(`               _Buffer: ${BittrexApi.formatNumber(bufferRate)}_`)
    msgs.push(`*Price*                   ${BittrexApi.formatNumber(price)} ${market}`)
    msgs.push(`*Quantity*         +${BittrexApi.formatNumber(quantity)} ${coin}`)
    msgs.push(`*Total*                  -${BittrexApi.formatNumber(total)} ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Balances 💰*`)
      if (isCheckWallet) {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wbuy.Available)} 🔜 *${BittrexApi.formatNumber(wbuy.Available + quantity)}* `)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available - total)}* `)
        if (w.Available < total) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (price > t.last) {
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

  private static async formatSellForm(t: TradingTemp, key, quantity, price, subTotal, commission, w, wsell, status, isCheckWallet, bufferRate?) {
    const [market, coin] = key.split('-')
    const total = +(subTotal + commission).toFixed(8)

    const msgs = []
    msgs.push(`SELLING FORM at *${new Date().toTimeString().split(' ')[0]}*`)
    // _${status === undefined ? '' : (status === BittrexOrder.Status.WAITING ? 'Waiting' : (status === BittrexOrder.Status.DONE ? 'Done' : 'Canceled'))}_
    msgs.push(`----------------------------------------------`)
    msgs.push(`*Market*               [${key}](https://bittrex.com/Market/Index?MarketName=${key})`)
    msgs.push(`                      🚀 _${BittrexApi.formatNumber(t.last)} ${market}_ 🚀`)
    if (bufferRate) msgs.push(`               _Buffer: ${BittrexApi.formatNumber(bufferRate)}_`)
    msgs.push(`*Price*                   ${BittrexApi.formatNumber(price)} ${market}`)
    msgs.push(`*Quantity*          -${BittrexApi.formatNumber(quantity)} ${coin}`)
    msgs.push(`*Total*                  +${BittrexApi.formatNumber(total)} ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Balances 💰*`)
      if (isCheckWallet) {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wsell.Available)} 🔜 *${BittrexApi.formatNumber(wsell.Available - quantity)}*`)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available + total)}*`)
        if (wsell.Available < quantity) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (price < t.last) {
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
    BittrexOrder.Bot.command('buy', async (ctx) => {
      const { reply, message, from, chat } = ctx
      try {
        const user = BittrexUser.users[from.id.toString()]
        if (!user) return reply('User not login yet')
        let [, key, quantity, price, bufferRate] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        price = BittrexApi.getQuickPrice(price)
        const [market] = key.split('-')
        const rate = 0.0025
        const balances = await user.getMyBalances()

        if (quantity === 'all') {
          const w = balances.find(e => e.Currency === market)
          quantity = (w.Available / (price + (rate * price)))
        } else {
          quantity = +quantity
        }
        quantity = +quantity.toFixed(8)
        const subTotal = +(quantity * price).toFixed(8)
        const commission = +(subTotal * rate).toFixed(8)

        if (!bufferRate) bufferRate = 0
        else bufferRate = +bufferRate
        if (isNaN(bufferRate)) bufferRate = 0

        const rs = await reply(`Ordering ${key}`)
        await BittrexOrder.add(undefined, from.id.toString(), chat.id, rs.message_id, key, quantity, price, subTotal, commission, bufferRate, BittrexOrder.Type.BUY, undefined)
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static registerSell() {
    BittrexOrder.Bot.action(/(sell|buy):(yes|no|bot) .+/, async (ctx) => {
      const { editMessageText, reply, match, from } = ctx
      try {
        const [action, key, _id, orderType] = match[0].split(' ')
        const od = BittrexOrder.orders[key].find(e => e._id === _id)
        if (action.includes(':yes')) {
          const { quantity, price, type } = od
          if (key && quantity && price) {
            const user = BittrexUser.users[from.id.toString()]
            if (!user) throw new Error('User has not login yet')
            let rs
            if (type === BittrexOrder.Type.SELL)
              rs = await user.sell(key, quantity, price, BittrexUser.ORDER_TYPE[+orderType]) as any
            else
              rs = await user.buy(key, quantity, price, BittrexUser.ORDER_TYPE[+orderType]) as any
            od.orderId = rs.OrderId
            od.status = BittrexOrder.Status.WAITING
            await BittrexOrder.save(key)
          } else {
            await reply('Market, quantity, price is required')
          }
        } else if (action.includes(':bot')) {
          // const [key, quantity, price, , bufferRate] = prms
          // if (key && quantity && price) {
          //   const user = BittrexUser.users[from.id.toString()]
          //   if (!user) throw new Error('User has not login yet')

          //   const rs = await user.botSell(key, +quantity, +price, +bufferRate, chat.id, callbackQuery.message.message_id) as any

          //   return await editMessageReplyMarkup({
          //     inline_keyboard: [[{ text: '🚫 CANCEL THIS BOT ORDER', callback_data: `order:botcancel ${rs._id}` }]]
          //   })
          // }
          await reply('Market, quantity, price is required')
        } else {
          od.status = BittrexOrder.Status.CANCELED
          BittrexOrder.save(key)
        }
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexOrder.Bot.command('sell', async (ctx) => {
      const { reply, message, from, chat } = ctx
      try {
        const user = BittrexUser.users[from.id.toString()]
        if (!user) return reply('User not login yet')
        let [, key, quantity, price, bufferRate] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        price = BittrexApi.getQuickPrice(price)
        const [, coin] = key.split('-')
        const rate = 0.0025
        const balances = await user.getMyBalances()

        if (quantity === 'all') {
          const wsell = balances.find(e => e.Currency === coin)
          quantity = wsell.Available
        } else {
          quantity = +quantity
        }
        quantity = +quantity.toFixed(8)
        const subTotal = +(quantity * price).toFixed(8)
        const commission = +(subTotal * rate).toFixed(8)

        if (!bufferRate) bufferRate = 0
        else bufferRate = +bufferRate
        if (isNaN(bufferRate)) bufferRate = 0

        const rs = await reply(`Ordering ${key}`)
        await BittrexOrder.add(undefined, from.id.toString(), chat.id, rs.message_id, key, quantity, price, subTotal, commission, bufferRate, BittrexOrder.Type.SELL, undefined)
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static async registerMyOrders() {
    BittrexOrder.Bot.action(/order:(cancel|botcancel) .+/, async (ctx) => {
      const { editMessageText, match } = ctx
      try {
        const [action, key, _id] = match[0].split(' ')

        const od = await BittrexOrder.get(key, _id)
        const user = BittrexUser.users[od.user]
        if (!user) throw new Error('User has not login yet')

        if (action === 'order:cancel') {
          await user.cancel(od.orderId)
          await BittrexOrder.remove(key, od._id)
        } else {
          // user.botCancel(orderId)
        }
        await editMessageText(`🚫 Canceled the order`)
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    // BittrexOrder.Bot.command('order', async (ctx) => {
    //   const { replyWithMarkdown, from, reply } = ctx
    //   try {
    //     const user = BittrexUser.users[from.id.toString()]
    //     if (!user) return reply('User not login yet')
    //     const orders = await user.getMyOrders()
    //     if (orders.length === 0 && user.botOrders.length === 0) return await reply('Have no any order')
    //     const balances = await user.getMyBalances()
    //     const rate = 0.0025
    //     for (let o of orders) {
    //       const key = o.Exchange
    //       const price = o.Limit
    //       const quantity = o.Quantity
    //       const [market, coin] = key.split('-')
    //       const w = balances.find(e => e.Currency === market)
    //       const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
    //       const subTotal = +(quantity * price).toFixed(8)
    //       const commission = +(subTotal * rate).toFixed(8)
    //       const status = o.CancelInitiated ? BittrexOrder.Status.CANCEL : (o.Closed ? BittrexOrder.Status.DONE : BittrexOrder.Status.WAITING)

    //       const { msgs, isOk } = o.OrderType === 'LIMIT_BUY' ? await BittrexOrder.formatBuyForm(key, quantity, price, subTotal, commission, w, wbuy, status, false) : await BittrexOrder.formatSellForm(key, quantity, price, subTotal, commission, w, wbuy, false)
    //       const m = await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
    //         m.callbackButton('🚫 CANCEL THIS ORDER', `order:cancel ${o.OrderUuid}`),
    //       ])))
    //       await user.addOrder(o.OrderUuid, m.chat.id, m.message_id)
    //     }
    //     for (let o of user.botOrders) {
    //       const key = o.key
    //       const price = o.price
    //       const quantity = o.quantity
    //       const [market, coin] = key.split('-')
    //       const w = balances.find(e => e.Currency === market)
    //       const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
    //       const subTotal = +(quantity * price).toFixed(8)
    //       const commission = +(subTotal * rate).toFixed(8)
    //       const bufferRate = o.rate

    //       const { msgs, isOk } = o.action === 'buy' ? await BittrexOrder.formatBuyForm(key, quantity, price, subTotal, commission, w, wbuy, false, bufferRate) : await BittrexOrder.formatSellForm(key, quantity, price, subTotal, commission, w, wbuy, false, bufferRate)
    //       await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
    //         m.callbackButton('🚫 CANCEL THIS BOT ORDER', `order:botcancel ${o._id}`)
    //       ])))
    //     }
    //   } catch (e) {
    //     await reply(e.message || e)
    //   }
    // })
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
