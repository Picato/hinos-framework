import { REDIS, Redis } from 'hinos-redis/lib/redis';
import BittrexApi from './BittrexApi';
import BittrexUser from './BittrexUser';
import * as Extra from 'telegraf/extra'
import { TradingTemp } from '../Crawler/RawHandler'
import { BotCommand } from './Telegram';
import HttpError from '../../../common/HttpError';

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
  static botOrders = {} as { [key: string]: BittrexOrder[] }

  public orderId
  public cachedPrice

  constructor(public _id = BittrexApi.getId(), public user, public chatId, public messageId, public key: string, public quantity: number, public price: number, public subTotal: number, public commission: number, public bufferRate: number, public type: number, public status: number) {
    this.cachedPrice = this.price
  }

  canBeOrder(price: number) {
    if (this.type === BittrexOrder.Type.BUY) {
      if (price >= this.cachedPrice + this.bufferRate) return true
      if (price < this.cachedPrice) this.cachedPrice = price
    } else {
      if (price <= this.cachedPrice - this.bufferRate) return true
      if (price > this.cachedPrice) this.cachedPrice = price
    }
    return false
  }

  static async init() {
    console.log('TELEGRAM', 'BittrexOrder', 'init')
    BittrexOrder.initCommand()
    // await BittrexOrder.checkOrder()
    let als = await BittrexOrder.redis.hget(`bittrex.orders`)
    if (als) {
      for (let k in als) {
        for (const { key, user, chatId, messageId, quantity, price, subTotal, commission, bufferRate, _id, status, type } of JSON.parse(als[k])) {
          await BittrexOrder.add(_id, user, chatId, messageId, key, quantity, price, subTotal, commission, bufferRate, type, status)
        }
      }
    }
    // Redis.subscribe('updateData', async (data) => {
    //   const { tradings } = JSON.parse(data)
    // await BittrexOrder.runBackground(tradings)
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
    // }, AppConfig.redis)
  }

  static async runBackground(tradings: TradingTemp[]) {
    // console.log('TELEGRAM', 'BittrexOrder', 'runBackground')
    const orders = BittrexOrder.orders
    const botOrders = BittrexOrder.botOrders
    for (let k in orders) {
      const t = tradings.find(e => e.key === k)
      for (let i = orders[k].length - 1; i >= 0; i--) {
        const od = orders[k][i]
        const { key, user, chatId, messageId, quantity, price, subTotal, commission, bufferRate, _id, status, type } = od
        try {
          if (!t) throw HttpError.BAD_REQUEST(`Could not found key ${key}`)
          if (status === BittrexOrder.Status.CANCELED) {
            await BittrexOrder.remove(key, _id)
            await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Canceled order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) buy *${quantity}* coins with price *${price}*`, Extra.markdown())
          } else if (status === BittrexOrder.Status.DONE) {
            await BittrexOrder.remove(key, _id)
            await BittrexOrder.Bot.send(chatId, `Bought ${quantity} ${key} with price ${price} type is ${BittrexOrder.ORDER_TYPE[type]}`)
          } else if (status === BittrexOrder.Status.WAITING) {
            let msgs
            const usr = BittrexUser.get(user)
            if (od.orderId) {
              const oder = await usr.getOrder(od.orderId)
              if (oder.IsOpen) {
                if (type === BittrexOrder.Type.BUY) {
                  const rs = await BittrexOrder.formatOrderForm(t, key, quantity, price, subTotal, commission, undefined, undefined, bufferRate, type)
                  msgs = rs.msgs
                } else {
                  const rs = await BittrexOrder.formatOrderForm(t, key, quantity, price, subTotal, commission, undefined, undefined, bufferRate, type)
                  msgs = rs.msgs
                }
                await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([
                  m.callbackButton('🚫 CANCEL', `order:cancel ${key} ${_id}`),
                ])))
              } else {
                try {
                  if (oder.CancelInitiated) {
                    await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) ${od.type === BittrexOrder.Type.BUY ? 'buy' : 'sell'} *${od.quantity}* statoshi with price *${od.price}* was canceled`, { parse_mode: 'Markdown' })
                  } else {
                    if (oder.ImmediateOrCancel && oder.Quantity === oder.QuantityRemaining) {
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
                  await BittrexOrder.remove(key, od._id)
                }
              }
            } else {
              // Bot order

            }
          } else {
            const usr = BittrexUser.get(user)
            const balances = await usr.getMyBalances()
            const [market, coin] = key.split('-')
            const w = balances.find(e => e.Currency === market)
            let msgs, isOk
            if (type === BittrexOrder.Type.BUY) {
              const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
              const rs = await BittrexOrder.formatOrderForm(t, key, quantity, price, subTotal, commission, w, wbuy, bufferRate, type)
              msgs = rs.msgs
              isOk = rs.isOk
            } else {
              const wsell = balances.find(e => e.Currency === coin) || { Available: 0 }
              const rs = await BittrexOrder.formatOrderForm(t, key, quantity, price, subTotal, commission, w, wsell, bufferRate, type)
              msgs = rs.msgs
              isOk = rs.isOk
            }
            await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), !isOk ? Extra.markdown() : Extra.markdown().markup(m => m.inlineKeyboard([
              m.callbackButton('✅ BID', `buy:yes ${key} ${_id} 1`),
              m.callbackButton('🚀 IMMEDIATE', `buy:yes ${key} ${_id} 0`),
              m.callbackButton('👻 BOT', `buy:bot ${key} ${_id} 0`),
              m.callbackButton('🚫 CANCEL', `buy:no ${key} ${_id}`),
            ])))
          }
        } catch (e) {
          await BittrexOrder.remove(key, _id)
          await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, e.message, Extra.markdown())
        }
      }
    }
    for (let k in botOrders) {
      const t = tradings.find(e => e.key === k)
      for (let i = botOrders[k].length - 1; i >= 0; i--) {
        const o = botOrders[k][i]
        const { key, quantity, price, chatId, messageId, type } = o
        t.last = type === BittrexOrder.Type.SELL ? t.ask : t.bid
        if (o.canBeOrder(t.last)) {
          const rs = {} as any
          if (type === BittrexOrder.Type.SELL) {
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
          await o.botCancel()
        } else if (o.changedLimit) {
          o.changedLimit = false
          await BittrexOrder.Bot.send(chatId, `[${action.toUpperCase()}] Bot is holding ${+quantity} ${key} with price ${BittrexApi.formatNumber(t.last)} (${BittrexApi.formatNumber(t.last - price)} = ${BittrexApi.formatNumber((t.last - price) * quantity)})`)
        }
      }
    }
  }

  async botCancel() {
    const idx = BittrexOrder.botOrders[this.key].findIndex(e => e._id === this._id)
    if (idx !== -1) {
      BittrexOrder.botOrders[this.key].splice(idx, 1)
      await BittrexOrder.save(this.key)
    }
  }

  private static initCommand() {
    BittrexOrder.registerBuySell()
    BittrexOrder.registerMyOrders()
    BittrexOrder.Bot.startPolling()
  }

  static async remove(key, id) {
    let od
    if (id === undefined) {
      for (let od of BittrexOrder.orders[key]) {
        await BittrexOrder.Bot.deleteMessage(od.chatId, od.messageId)
      }
      delete BittrexOrder.orders[key]
    } else {
      od = BittrexOrder.orders[key]
      const idx = od.findIndex(e => e._id === id)
      try {
        await BittrexOrder.Bot.deleteMessage(od.chatId, od.messageId)
      } catch (_e) { }
      od.splice(idx, 1)
      if (od.length === 0) delete BittrexOrder.orders[key]
    }
    await BittrexOrder.save(key)
  }

  static async removeByUser(user) {
    for (let key in BittrexOrder.orders) {
      const ods = BittrexOrder.orders[key]
      for (let i = ods.length - 1; i >= 0; i--) {
        const od = ods[i]
        if (od.user === user) {
          ods.splice(i, 1)
          try {
            await BittrexOrder.Bot.deleteMessage(od.chatId, od.messageId)
          } catch (e) {
            console.error(e)
          }
        }
      }
      if (ods.length === 0) delete BittrexOrder.orders[key]
      await BittrexOrder.save(key)
    }
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

  static async getByOrderId(key, orderId) {
    if (!BittrexOrder.orders[key]) BittrexOrder.orders[key] = []
    return BittrexOrder.orders[key].find(e => e.orderId === orderId)
  }

  static async save(key) {
    if (!BittrexOrder.orders[key])
      await BittrexOrder.redis.hdel(`bittrex.orders`, key)
    else
      await BittrexOrder.redis.hset(`bittrex.orders`, {
        [key]: JSON.stringify(BittrexOrder.orders[key])
      })
  }

  private static async formatOrderForm(t: TradingTemp, key, quantity, price, subTotal, commission, w, wbs, bufferRate, type) {
    const [market, coin] = key.split('-')
    const total = +(subTotal + commission).toFixed(8)

    const msgs = []
    msgs.push(`${type === BittrexOrder.Type.BUY ? 'BUYING' : 'SELLING'} FORM at *${new Date().toTimeString().split(' ')[0]}*`)
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
      if (type === BittrexOrder.Type.BUY) {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wbs.Available)} 🔜 *${BittrexApi.formatNumber(wbs.Available + quantity)}* `)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available - total)}* `)
        if (w.Available < total) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (price > t.last) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price > last price ??? 😱_')
        }
      } else {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wbs.Available)} 🔜 *${BittrexApi.formatNumber(wbs.Available - quantity)}*`)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available + total)}*`)
        if (wbs.Available < quantity) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (price < t.last) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price < last price ??? 😱_')
        }
      }
      msgs.push(`----------------------------------------------`)
    }
    msgs.push()
    return { msgs, isOk }
  }

  private static registerBuySell() {
    BittrexOrder.Bot.action(/(sell|buy):(yes|no|bot) .+/, async (ctx) => {
      const { editMessageText, reply, match, from } = ctx
      try {
        const [action, key, _id, orderType] = match[0].split(' ')
        const od = BittrexOrder.orders[key].find(e => e._id === _id)
        if (action.includes(':yes')) {
          const { quantity, price, type } = od
          if (key && quantity && price) {
            const user = BittrexUser.get(from.id.toString())
            let rs
            if (type === BittrexOrder.Type.SELL)
              rs = await user.sell(key, quantity, price, BittrexUser.ORDER_TYPE[+orderType]) as any
            else
              rs = await user.buy(key, quantity, price, BittrexUser.ORDER_TYPE[+orderType]) as any
            od.orderId = rs.OrderId
            od.status = BittrexOrder.Status.WAITING
            await BittrexOrder.save(key)
          } else {
            await editMessageText('Market, quantity, price is required')
          }
        } else if (action.includes(':bot')) {
          const { quantity, price, type } = od
          if (key && quantity && price) {
            BittrexUser.get(from.id.toString())
            od.orderId = undefined
            od.status = BittrexOrder.Status.WAITING
            await BittrexOrder.save(key)
          }
          await reply('Market, quantity, price is required')
        } else {
          od.status = BittrexOrder.Status.CANCELED
          BittrexOrder.save(key)
        }
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexOrder.Bot.hears(/^\/(buy|sell) .+/, async (ctx) => {
      const { reply, message, from, chat } = ctx
      try {
        const user = BittrexUser.get(from.id.toString())
        let [action, key, quantity, price, bufferRate] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        price = BittrexApi.getQuickPrice(price)
        const [market, coin] = key.split('-')
        const rate = 0.0025
        const balances = await user.getMyBalances()
        const type = action === '/buy' ? BittrexOrder.Type.BUY : BittrexOrder.Type.SELL
        if (quantity === 'all') {
          if (type === BittrexOrder.Type.BUY) {
            const w = balances.find(e => e.Currency === market)
            quantity = (w.Available / (price + (rate * price)))
          } else {
            if (quantity === 'all') {
              const wsell = balances.find(e => e.Currency === coin)
              quantity = wsell.Available
            }
          }
        } else {
          quantity = +quantity
        }
        const subTotal = +(quantity * price).toFixed(8)
        const commission = +(subTotal * rate).toFixed(8)

        if (!bufferRate) bufferRate = 0
        else bufferRate = +bufferRate
        if (isNaN(bufferRate)) bufferRate = 0

        const rs = await reply(`Ordering ${key}`)
        await BittrexOrder.add(undefined, from.id.toString(), chat.id, rs.message_id, key, quantity, price, subTotal, commission, bufferRate, type, undefined)
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
        const user = BittrexUser.get(od.user)

        if (action === 'order:cancel') {
          await BittrexOrder.remove(key, od._id)
          await user.cancel(od.orderId)
        } else {
          // user.botCancel(orderId)
        }
        await BittrexOrder.Bot.editMessageReplyMarkup(od.chatId, od.messageId, undefined, {
          inline_keyboard: [[{ text: 'THIS ORDER WAS CANCELED 🚫', url: 'https://bittrex.com/History' }]]
        })
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexOrder.Bot.command('order', async (ctx) => {
      const { from, reply, chat } = ctx
      try {
        await BittrexOrder.removeByUser(from.id.toString())
        const user = BittrexUser.get(from.id.toString())
        const orders = await user.getMyOrders()
        if (orders.length === 0 && user.botOrders.length === 0) return await reply('Have no any order')
        const rate = 0.0025
        for (let o of orders) {
          const key = o.Exchange
          const price = o.Limit
          const quantity = o.Quantity
          const subTotal = +(quantity * price).toFixed(8)
          const commission = +(subTotal * rate).toFixed(8)
          const status = o.CancelInitiated ? BittrexOrder.Status.CANCELED : (o.Closed ? BittrexOrder.Status.DONE : BittrexOrder.Status.WAITING)
          const type = o.OrderType === 'LIMIT_BUY' ? BittrexOrder.Type.BUY : BittrexOrder.Type.SELL
          const rs = await reply(`Reloading order ${key}`)
          const od = await BittrexOrder.add(undefined, from.id.toString(), chat.id, rs.message_id, key, quantity, price, subTotal, commission, 0, type, status)
          od.orderId = o.OrderUuid
          await BittrexOrder.save(key)
        }
        // for (let o of user.botOrders) {
        //   const key = o.key
        //   const price = o.price
        //   const quantity = o.quantity
        //   const [market, coin] = key.split('-')
        //   const w = balances.find(e => e.Currency === market)
        //   const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
        //   const subTotal = +(quantity * price).toFixed(8)
        //   const commission = +(subTotal * rate).toFixed(8)
        //   const bufferRate = o.rate

        //   const { msgs, isOk } = o.action === 'buy' ? await BittrexOrder.formatBuyForm(key, quantity, price, subTotal, commission, w, wbuy, false, bufferRate) : await BittrexOrder.formatSellForm(key, quantity, price, subTotal, commission, w, wbuy, false, bufferRate)
        //   await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
        //     m.callbackButton('🚫 CANCEL THIS BOT ORDER', `order:botcancel ${o._id}`)
        //   ])))
        // }
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  // static async checkOrder() {
  //   for (const username in BittrexUser.getAll()) {
  //     const user = BittrexUser.get(username)
  //     const orderIds = user.orderIds
  //     if (user.orderIds.length > 0) {
  //       for (let i = orderIds.length - 1; i >= 0; i--) {
  //         const { orderId, chatId, messageId } = orderIds[i]
  //         const od = await user.getOrder(orderId)
  //         if (!od.IsOpen) {
  //           try {
  //             if (od.CancelInitiated) {
  //               // User Canceled
  //               await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Order [${od.Exchange}](https://bittrex.com/Market/Index?MarketName=${od.Exchange}) ${od.Type === 'LIMIT_BUY' ? 'buy' : 'sell'} *${od.Quantity}* statoshi with price *${od.Limit}* was canceled by another`, { parse_mode: 'Markdown' })
  //             } else {
  //               // Success
  //               if (od.ImmediateOrCancel && od.Quantity === od.QuantityRemaining) {
  //                 await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
  //                   inline_keyboard: [[{ text: 'THIS ORDER IS MISSED 💢', url: 'https://bittrex.com/History' }]]
  //                 })
  //               } else {
  //                 await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
  //                   inline_keyboard: [[{ text: 'THIS ORDER HAS DONE 👍', url: 'https://bittrex.com/History' }]]
  //                 })
  //               }
  //             }
  //           } catch (e) {
  //             console.error('Got problem in checkOrder', e)
  //           } finally {
  //             await user.removeOrder(orderId)
  //           }
  //         }
  //       }
  //     }
  //   }
  //   setTimeout(BittrexOrder.checkOrder, 5000)
  // }
}
