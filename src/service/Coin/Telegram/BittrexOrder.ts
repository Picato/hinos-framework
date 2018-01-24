import { REDIS, Redis } from 'hinos-redis/lib/redis';
import BittrexApi from './BittrexApi';
import BittrexUser from './BittrexUser';
import * as Extra from 'telegraf/extra'
import { TradingTemp } from '../Crawler/RawHandler'
import { BotCommand } from './Telegram';
import HttpError from '../../../common/HttpError';

export default class BittrexOrder {
  static readonly Status = {
    PREPARE: -2,
    WAITING: 0,
    CANCELED: -1,
    DONE: 2
  }
  static readonly Type = {
    BUY: -1,
    SELL: 1
  }
  static readonly ORDER_TYPE = {
    IMMEDIATE: '0',
    BID: '1',
    BOT: '2'
  }

  static Bot = new BotCommand(AppConfig.app.telegram.OrderBot)

  @REDIS()
  private static redis: Redis

  static orders = {} as { [key: string]: BittrexOrder[] }
  // static botOrders = {} as { [key: string]: BittrexOrder[] }

  public firstPrice
  private botEnable

  constructor(public _id = BittrexApi.getId(), public user, public chatId, public messageId, public key: string, public _quantity: number | string, public price: number, public bufferRate: number, public action: number, public type: string, public status: number, public orderId) {
    this.firstPrice = price
  }

  static getTypeValue(type) {
    return type === '0' ? 'IMMEDIATE_OR_CANCEL' : (type === '1' ? 'GOOD_TIL_CANCELLED' : 'FILL_OR_KILL')
  }

  async getQuantity() {
    if (this._quantity === 'all') {
      const usr = BittrexUser.get(this.user)
      const balances = await usr.getMyBalances()
      const [market, coin] = this.key.split('-')
      if (this.action === BittrexOrder.Type.BUY) {
        const w = balances.find(e => e.Currency === market)
        return (w.Available / (this.price + (0.0025 * this.price)))
      } else {
        const wsell = balances.find(e => e.Currency === coin)
        return wsell.Available
      }
    }
    return this._quantity
  }
  async getSubTotal() {
    const quantity = await this.getQuantity()
    return +(quantity * this.price).toFixed(8)
  }
  async getCommission() {
    const subTotal = await this.getSubTotal()
    return +(subTotal * 0.0025).toFixed(8)
  }
  async getTotal() {
    const subTotal = await this.getSubTotal()
    const commission = await this.getCommission()
    return +(subTotal + commission).toFixed(8)
  }

  canBeOrder(price: number) {
    if (this.action === BittrexOrder.Type.BUY) {
      if (!this.botEnable) {
        if (price <= this.firstPrice) {
          this.botEnable = true
          this.price = price + this.bufferRate
        }
      } else {
        if (price < this.price)
          this.price = price + this.bufferRate
        else if (price >= this.price && price < this.price + this.bufferRate)
          return true
      }
    } else {
      if (!this.botEnable) {
        if (price >= this.firstPrice) {
          this.botEnable = true
          this.price = price - this.bufferRate
        }
      } else {
        if (price > this.price)
          this.price = price - this.bufferRate
        else if (price <= this.price && price > this.price - this.bufferRate)
          return true
      }
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
        for (const { key, user, chatId, messageId, _quantity, bufferRate, _id, status, type, action, firstPrice, orderId } of JSON.parse(als[k])) {
          await BittrexOrder.add(_id, user, chatId, messageId, key, _quantity, firstPrice, bufferRate, action, type, status, orderId)
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
    // const botOrders = BittrexOrder.botOrders
    for (let k in orders) {
      const t = tradings.find(e => e.key === k)
      for (let i = orders[k].length - 1; i >= 0; i--) {
        const od = orders[k][i]
        const { key, user, chatId, messageId, price, _id, status, type, action } = od
        const quantity = await od.getQuantity()
        try {
          if (!t) throw HttpError.BAD_REQUEST(`Could not found key ${key}`)
          if (status === BittrexOrder.Status.CANCELED) {
            await BittrexOrder.remove(key, _id)
            await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Canceled order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) buy *${quantity}* coins with price *${price}*`, Extra.markdown())
          } else if (status === BittrexOrder.Status.DONE) {
            await BittrexOrder.remove(key, _id)
            await BittrexOrder.Bot.send(chatId, `Bought ${quantity} ${key} with price ${price} type is ${type}`)
          } else if (status === BittrexOrder.Status.WAITING) {
            let msgs
            const usr = BittrexUser.get(user)
            if (od.orderId) {
              const oder = await usr.getOrder(od.orderId)
              if (oder.IsOpen) {
                if (action === BittrexOrder.Type.BUY) {
                  const rs = await BittrexOrder.formatOrderForm(t, od, undefined, undefined)
                  msgs = rs.msgs
                } else {
                  const rs = await BittrexOrder.formatOrderForm(t, od, undefined, undefined)
                  msgs = rs.msgs
                }
                await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([
                  m.callbackButton('🚫 CANCEL', `order:cancel ${key} ${_id}`),
                ])))
              } else {
                try {
                  if (oder.CancelInitiated) {
                    const quantity = await od.getQuantity()
                    await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) ${od.action === BittrexOrder.Type.BUY ? 'buy' : 'sell'} *${quantity}* statoshi with price *${od.price}* was canceled`, { parse_mode: 'Markdown' })
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
              const quantity = await od.getQuantity()
              t.last = action === BittrexOrder.Type.SELL ? t.ask : t.bid
              if (od.canBeOrder(t.last)) {
                const rs = {} as any
                if (action === BittrexOrder.Type.SELL) {
                  await BittrexOrder.Bot.send(chatId, `Selled ${quantity} ${key} with price ${+t.last}/${price} type is ${BittrexOrder.getTypeValue(type)}`)
                  // const rs = await user.sell(key, +quantity, +t.last, type) as any
                  // await user.addOrder(rs.OrderId, chatId, messageId)

                  await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                    inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
                  })
                } else {
                  await BittrexOrder.Bot.send(chatId, `Bought ${quantity} ${key} with price ${+t.last}/${price} type is ${BittrexOrder.getTypeValue(type)}`)
                  // const rs = await user.buy(key, +quantity, +t.last, type) as any
                  // await user.addOrder(rs.OrderId, chatId, messageId)

                  await BittrexOrder.Bot.editMessageReplyMarkup(chatId, messageId, undefined, {
                    inline_keyboard: [[
                      { text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${od._id}` }
                    ]]
                  })
                }
                await BittrexOrder.remove(key, od._id)
              }
              // Bot order
              if (action === BittrexOrder.Type.BUY) {
                const rs = await BittrexOrder.formatOrderForm(t, od, undefined, undefined)
                msgs = rs.msgs
              } else {
                const rs = await BittrexOrder.formatOrderForm(t, od, undefined, undefined)
                msgs = rs.msgs
              }
              // thanh: Them immediate khi dat order roi muon ban hay mua ngay
              await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([
                m.callbackButton('🚫 CANCEL', `order:botcancel ${key} ${_id}`)
              ])))
            }
          } else if (status === BittrexOrder.Status.PREPARE) {
            const usr = BittrexUser.get(user)
            const balances = await usr.getMyBalances()
            const [market, coin] = key.split('-')
            const w = balances.find(e => e.Currency === market)
            let msgs, isOk
            if (action === BittrexOrder.Type.BUY) {
              const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
              const rs = await BittrexOrder.formatOrderForm(t, od, w, wbuy)
              msgs = rs.msgs
              isOk = rs.isOk
            } else {
              const wsell = balances.find(e => e.Currency === coin) || { Available: 0 }
              const rs = await BittrexOrder.formatOrderForm(t, od, w, wsell)
              msgs = rs.msgs
              isOk = rs.isOk
            }
            await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), !isOk ? Extra.markdown() : Extra.markdown().markup(m => m.inlineKeyboard([
              [
                m.callbackButton('✅ BID', `order:bid ${key} ${_id} ${BittrexOrder.ORDER_TYPE.BID}`),
                m.callbackButton('🚀 IMMEDIATE', `order:immediate ${key} ${_id} ${BittrexOrder.ORDER_TYPE.IMMEDIATE}`),
                m.callbackButton('👻 BOT', `order:bot ${key} ${_id} ${BittrexOrder.ORDER_TYPE.IMMEDIATE}`),
              ],
              [
                m.callbackButton('AGREE 👍', `order:yes ${key} ${_id} ${od.type} ${od.price}`),
                m.callbackButton('🚫 CANCEL', `order:no ${key} ${_id}`)
              ]
            ])))
          }
        } catch (e) {
          await BittrexOrder.remove(key, _id)
          await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, e.message, Extra.markdown())
        }
      }
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

  static async add(_id, user, chatId, messageId, key, quantity, price, bufferRate, action, type, status, orderId) {
    const b = new BittrexOrder(_id, user, chatId, messageId, key, quantity, price, bufferRate, action, type, status, orderId)
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

  private static async formatOrderForm(t: TradingTemp, od: BittrexOrder, w, wbs) {
    const [market, coin] = od.key.split('-')
    const msgs = []
    msgs.push(`${od.action === BittrexOrder.Type.BUY ? 'BUYING' : 'SELLING'} FORM at *${new Date().toTimeString().split(' ')[0]}*`)
    // _${status === undefined ? '' : (status === BittrexOrder.Status.WAITING ? 'Waiting' : (status === BittrexOrder.Status.DONE ? 'Done' : 'Canceled'))}_
    const sign = od.action === BittrexOrder.Type.BUY ? 1 : -1
    msgs.push(`----------------------------------------------`)
    msgs.push(`*Market*               [${od.key}](https://bittrex.com/Market/Index?MarketName=${od.key})`)
    if (od.type === BittrexOrder.ORDER_TYPE.BID) {
      od.price = od.firstPrice
      msgs.push(`*Last*                     ${BittrexApi.formatNumber(t.last, true)} ${market} 🚀`)
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Bid*                      *${BittrexApi.formatNumber(od.price * sign * -1, true)}* ${market} ✅`)      
    } else if (od.type === BittrexOrder.ORDER_TYPE.IMMEDIATE) {
      od.price = t.last
      msgs.push(`*Last*                     *${BittrexApi.formatNumber(t.last, true)}* ${market} 🚀`)
      msgs.push(`----------------------------------------------`)      
    } else if (od.type === BittrexOrder.ORDER_TYPE.BOT) {
      od.price = od.firstPrice
      msgs.push(`*Last*                     ${BittrexApi.formatNumber(t.last, true)} ${market} 🚀`)
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Bot Bid*             *${BittrexApi.formatNumber((od.price + od.bufferRate) * sign * -1, true)}* ${market} 👻`)
      msgs.push(`                              _${BittrexApi.formatNumber(od.firstPrice)} ${market}_`)
      if (od.bufferRate !== 0)
        msgs.push(`                          _+-${BittrexApi.formatNumber(od.bufferRate)} ${market}_`)
    }
    const quantity = await od.getQuantity()
    const total = await od.getTotal()
    msgs.push(`*Quantity*           ${BittrexApi.formatNumber(quantity * sign, true)} ${coin}`)
    msgs.push(`*Total*                  ${BittrexApi.formatNumber(total * sign * -1, true)} ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Balances 💰*`)
      if (od.action === BittrexOrder.Type.BUY) {
        msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wbs.Available)} 🔜 *${BittrexApi.formatNumber(wbs.Available + quantity)}* `)
        msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available - total)}* `)
        if (w.Available < total) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (od.price > t.last) {
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
        if (od.price < t.last) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price < last price ??? 😱_')
        }
      }
    }
    msgs.push()
    return { msgs, isOk }
  }

  private static registerBuySell() {
    BittrexOrder.Bot.action(/order:(yes|no|bot|bid|immediate|cancel|botcancel) .+/, async (ctx) => {
      const { editMessageText, match, from } = ctx
      try {
        const [action, key, _id, type, last] = match[0].split(' ')
        const od = BittrexOrder.orders[key].find(e => e._id === _id)
        if (action.includes('order:bid')) {
          od.type = BittrexOrder.ORDER_TYPE.BID
          await BittrexOrder.save(key)
        } else if (action.includes('order:immediate')) {
          od.type = BittrexOrder.ORDER_TYPE.IMMEDIATE
          await BittrexOrder.save(key)
        } else if (action.includes('order:bot')) {
          od.type = BittrexOrder.ORDER_TYPE.BOT
          await BittrexOrder.save(key)
        } else if (action.includes('order:yes')) {
          if (type === BittrexOrder.ORDER_TYPE.BID || type === BittrexOrder.ORDER_TYPE.IMMEDIATE) {
            if (type === BittrexOrder.ORDER_TYPE.IMMEDIATE)
              od.price = +last
            const quantity = await od.getQuantity()
            const user = BittrexUser.get(from.id.toString())
            let rs
            if (od.action === BittrexOrder.Type.SELL)
              rs = await user.sell(key, quantity, od.price, BittrexOrder.getTypeValue(type)) as any
            else
              rs = await user.buy(key, quantity, od.price, BittrexOrder.getTypeValue(type)) as any
            od.orderId = rs.OrderId
            od.status = BittrexOrder.Status.WAITING
            if (type === BittrexOrder.ORDER_TYPE.BID)
              od._quantity = quantity
            await BittrexOrder.save(key)
          } else if (type === BittrexOrder.ORDER_TYPE.BOT) {
            BittrexUser.get(from.id.toString())
            od.orderId = undefined
            od.status = BittrexOrder.Status.WAITING
            await BittrexOrder.save(key)
          }
        } else if (action.includes('order:cancel')) {
          const user = BittrexUser.get(from.id.toString())
          await BittrexOrder.remove(key, od._id)
          await user.cancel(od.orderId)
          await BittrexOrder.Bot.editMessageReplyMarkup(od.chatId, od.messageId, undefined, {
            inline_keyboard: [[{ text: 'THIS ORDER WAS CANCELED 🚫', url: 'https://bittrex.com/History' }]]
          })
        } else if (action.includes('order:botcancel')) {
          await BittrexOrder.remove(key, od._id)
          await BittrexOrder.Bot.editMessageReplyMarkup(od.chatId, od.messageId, undefined, {
            inline_keyboard: [[{ text: 'THIS BOT ORDER WAS CANCELED 🚫', url: 'https://bittrex.com/History' }]]
          })
        } else {
          od.status = BittrexOrder.Status.CANCELED
          await BittrexOrder.save(key)
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
        const type = action === '/buy' ? BittrexOrder.Type.BUY : BittrexOrder.Type.SELL
        bufferRate = BittrexApi.getQuickPrice(bufferRate || '0')

        const rs = await reply(`Ordering ${key}`)
        await BittrexOrder.add(undefined, from.id.toString(), chat.id, rs.message_id, key, quantity, price, bufferRate, type, BittrexOrder.ORDER_TYPE.BID, BittrexOrder.Status.PREPARE, undefined)
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static async registerMyOrders() {
    BittrexOrder.Bot.action(/order:() .+/, async (ctx) => {
      const { editMessageText, match } = ctx
      try {
        const [action, key, _id] = match[0].split(' ')
        const od = await BittrexOrder.get(key, _id)
        const user = BittrexUser.get(od.user)

        if (action === 'order:cancel') {
          await BittrexOrder.remove(key, od._id)
          await user.cancel(od.orderId)
          await BittrexOrder.Bot.editMessageReplyMarkup(od.chatId, od.messageId, undefined, {
            inline_keyboard: [[{ text: 'THIS ORDER WAS CANCELED 🚫', url: 'https://bittrex.com/History' }]]
          })
        } else {
          await BittrexOrder.remove(key, od._id)
          await BittrexOrder.Bot.editMessageReplyMarkup(od.chatId, od.messageId, undefined, {
            inline_keyboard: [[{ text: 'THIS BOT ORDER WAS CANCELED 🚫', url: 'https://bittrex.com/History' }]]
          })
        }
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
        for (let o of orders) {
          const key = o.Exchange
          const price = o.Limit
          const quantity = o.Quantity
          const status = o.CancelInitiated ? BittrexOrder.Status.CANCELED : (o.Closed ? BittrexOrder.Status.DONE : BittrexOrder.Status.WAITING)
          const type = o.OrderType === 'LIMIT_BUY' ? BittrexOrder.Type.BUY : BittrexOrder.Type.SELL
          const rs = await reply(`Reloading order ${key}`)
          await BittrexOrder.add(undefined, from.id.toString(), chat.id, rs.message_id, key, quantity, price, 0, type, BittrexOrder.ORDER_TYPE.BID, status, o.OrderUuid)
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

        //   const { msgs, isOk } = o.action === 'buy' ? await BittrexOrder.formatBuyForm(key, quantity, price, w, wbuy, false, bufferRate) : await BittrexOrder.formatSellForm(key, quantity, price, w, wbuy, false, bufferRate)
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
