import { REDIS, Redis } from 'hinos-redis/lib/redis';
import BittrexApi from './BittrexApi';
import BittrexUser from './BittrexUser';
import * as Extra from 'telegraf/extra'
import { TradingTemp } from '../Crawler/RawHandler'
import { BotCommand } from './Telegram';
import HttpError from '../../../common/HttpError';
import { Cached } from './Cached';

export default class BittrexOrder {
  static readonly Status = {
    PREPARE: -2,
    WAITING: 0,
    CANCELED: -1,
    DONE: 2
  }
  static readonly Action = {
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

  constructor(public _id = BittrexApi.getId(), public user, public chatId, public messageId, public key: string, public _quantity: number | string, public price: number, public bufferRate: number, public action: number, public type: string, public status: number, public orderId, public w, public wbs, public error, public success) {
    this.firstPrice = price
  }

  static getTypeValue(type) {
    return type === '0' ? 'IMMEDIATE_OR_CANCEL' : (type === '1' ? 'GOOD_TIL_CANCELLED' : 'IMMEDIATE_OR_CANCEL')
  }

  getQuantity() {
    if (this._quantity === 'all') {
      if (this.action === BittrexOrder.Action.BUY) {
        return (this.w.Available / (this.price + (0.0025 * this.price)))
      } else {
        return this.wbs.Available
      }
    }
    return this._quantity
  }
  getSubTotal() {
    const quantity = this.getQuantity()
    return +(quantity * this.price).toFixed(8)
  }
  getCommission() {
    const subTotal = this.getSubTotal()
    return +(subTotal * 0.0025).toFixed(8)
  }
  getTotal() {
    const subTotal = this.getSubTotal()
    const commission = this.getCommission()
    return +(subTotal + commission).toFixed(8)
  }

  canBeOrder(price: number) {
    if (this.action === BittrexOrder.Action.BUY) {
      if (!this.botEnable) {
        if (price <= this.firstPrice) {
          this.botEnable = true
          this.price = price + this.bufferRate
        }
      } else {
        if (price < this.price)
          this.price = price + this.bufferRate
        else if (price <= this.price + this.bufferRate)
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
        else if (price >= this.price - this.bufferRate)
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
        for (const { key, user, chatId, messageId, _quantity, bufferRate, _id, status, type, action, firstPrice, orderId, w, wbs, error, success } of JSON.parse(als[k])) {
          await BittrexOrder.add(_id, user, chatId, messageId, key, _quantity, firstPrice, bufferRate, action, type, status, orderId, w, wbs, error, success)
        }
      }
    }
  }

  static async runBackground() {
    const orders = BittrexOrder.orders
    for (let k in orders) {
      const t = Cached.tradings.find(e => e.key === k)
      for (let i = orders[k].length - 1; i >= 0; i--) {
        const od = orders[k][i]
        const { key, user, chatId, messageId, price, _id, status, type, action } = od
        const quantity = od.getQuantity()
        try {
          if (!t) throw HttpError.BAD_REQUEST(`Could not found key ${key}`)
          if (status === BittrexOrder.Status.CANCELED) {
            await BittrexOrder.remove(key, _id)
            await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Canceled order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) buy *${quantity}* coins with price *${price}*`, Extra.markdown())
          } else if (status === BittrexOrder.Status.DONE) {
            await BittrexOrder.remove(key, _id)
            const { msgs } = await BittrexOrder.formatOrderForm(t, od, undefined, undefined)
            await BittrexOrder.Bot.send(chatId, msgs.join('\n'), Extra.markdown())
          } else if (status === BittrexOrder.Status.WAITING) {
            let msgs
            const usr = BittrexUser.get(user)
            if (od.orderId) {
              const oder = await usr.getOrder(od.orderId)
              if (oder.IsOpen) {
                if (action === BittrexOrder.Action.BUY) {
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
                    const quantity = od.getQuantity()
                    await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, `🚫 Order [${key}](https://bittrex.com/Market/Index?MarketName=${key}) ${od.action === BittrexOrder.Action.BUY ? 'buy' : 'sell'} *${quantity}* statoshi with price *${od.price}* was canceled`, { parse_mode: 'Markdown' })
                  } else {
                    if (oder.ImmediateOrCancel && oder.Quantity === oder.QuantityRemaining) {
                      od.error = 'THIS ORDER IS MISSED 💢'
                    } else {
                      od.success = 'THIS ORDER HAS DONE 👍'
                    }
                    await BittrexOrder.save(key)
                  }
                } catch (e) {
                  console.error('Got problem in checkOrder', e)
                }
              }
            } else {
              // Bot
              const quantity = od.getQuantity()
              t.last = action === BittrexOrder.Action.SELL ? t.ask : t.bid
              if (od.canBeOrder(t.last)) {
                try { await BittrexOrder.Bot.deleteMessage(od.chatId, od.messageId) } catch (_e) { }
                let ors = {} as any
                let rs
                if (action === BittrexOrder.Action.SELL) {
                  try {
                    ors = await usr.sell(key, quantity, t.last, BittrexOrder.getTypeValue(type)) as any
                    rs = await BittrexOrder.Bot.send(chatId, `Selled ${quantity} ${key} with price ${BittrexApi.formatNumber(t.last)}/${BittrexApi.formatNumber(price)} type is ${BittrexOrder.getTypeValue(type)}`)
                  } catch (e) {
                    rs = await BittrexOrder.Bot.send(chatId, `Selling ${quantity} ${key} with price ${BittrexApi.formatNumber(t.last)}/${BittrexApi.formatNumber(price)} was failed: ${e}`)
                    od.status = BittrexOrder.Status.DONE
                    od.error = e
                  }
                } else {
                  try {
                    ors = await usr.buy(key, quantity, t.last, BittrexOrder.getTypeValue(type)) as any
                    rs = await BittrexOrder.Bot.send(chatId, `Bought ${quantity} ${key} with price ${BittrexApi.formatNumber(t.last)}/${BittrexApi.formatNumber(price)} type is ${BittrexOrder.getTypeValue(type)}`)
                  } catch (e) {
                    rs = await BittrexOrder.Bot.send(chatId, `Buying ${quantity} ${key} with price ${BittrexApi.formatNumber(t.last)}/${BittrexApi.formatNumber(price)} was failed: ${e}`)
                    od.status = BittrexOrder.Status.DONE
                    od.error = e
                  }
                }
                od.messageId = rs.message_id
                od.orderId = ors.OrderId
                await BittrexOrder.save(od.key)
              } else {
                // Bot order
                if (action === BittrexOrder.Action.BUY) {
                  const rs = await BittrexOrder.formatOrderForm(t, od, undefined, undefined)
                  msgs = rs.msgs
                } else {
                  const rs = await BittrexOrder.formatOrderForm(t, od, undefined, undefined)
                  msgs = rs.msgs
                }
                await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([
                  m.callbackButton('🚫 CANCEL', `order:botcancel ${key} ${_id}`)
                ])))
              }
            }
          } else if (status === BittrexOrder.Status.PREPARE) {
            let msgs, isOk
            if (action === BittrexOrder.Action.BUY) {
              const rs = await BittrexOrder.formatOrderForm(t, od, od.w, od.wbs)
              msgs = rs.msgs
              isOk = rs.isOk
            } else {
              const rs = await BittrexOrder.formatOrderForm(t, od, od.w, od.wbs)
              msgs = rs.msgs
              isOk = rs.isOk
            }
            await BittrexOrder.Bot.editMessageText(chatId, messageId, undefined, msgs.join('\n'), !isOk ? Extra.markdown() : Extra.markdown().markup(m => m.inlineKeyboard([
              [
                m.callbackButton(`✅ BID ${od.type === BittrexOrder.ORDER_TYPE.BID ? '✔️' : ''}`, `order:bid ${key} ${_id} ${BittrexOrder.ORDER_TYPE.BID}`),
                m.callbackButton(`🚀 NOW ${od.type === BittrexOrder.ORDER_TYPE.IMMEDIATE ? '✔️' : ''}`, `order:immediate ${key} ${_id} ${BittrexOrder.ORDER_TYPE.IMMEDIATE}`),
                m.callbackButton(`👻 BOT ${od.type === BittrexOrder.ORDER_TYPE.BOT ? '✔️' : ''}`, `order:bot ${key} ${_id} ${BittrexOrder.ORDER_TYPE.BOT}`),
              ],
              [
                m.callbackButton(`${od.action === BittrexOrder.Action.SELL ? 'SELL' : 'BUY'} 👍`, `order:yes ${key} ${_id} ${od.type} ${od.price}`),
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
        if (od.user === user && od.orderId) {
          ods.splice(i, 1)
          try {
            await BittrexOrder.Bot.deleteMessage(od.chatId, od.messageId)
          } catch (e) { }
        }
      }
      if (ods.length === 0) delete BittrexOrder.orders[key]
      await BittrexOrder.save(key)
    }
  }

  static async add(_id, user, chatId, messageId, key, quantity, price, bufferRate, action, type, status, orderId, w, wbs, error, success) {
    const b = new BittrexOrder(_id, user, chatId, messageId, key, quantity, price, bufferRate, action, type, status, orderId, w, wbs, error, success)
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
    const msgs = [`⏱ *${new Date().toTimeString().split(' ')[0]}* ⏱`,]
    const sign = od.action === BittrexOrder.Action.BUY ? 1 : -1
    const lastPrice = od.action === BittrexOrder.Action.BUY ? t.bid : t.ask
    msgs.push(`----------------------------------------------`)
    msgs.push(`[${od.key}](https://bittrex.com/Market/Index?MarketName=${od.key})    *${BittrexApi.formatNumber(lastPrice)}* ${market} 🚀`)
    if (od.type === BittrexOrder.ORDER_TYPE.BID) {
      if (od.status === BittrexOrder.Status.PREPARE) od.price = od.firstPrice
      msgs.push(`*📍Mine*   *${BittrexApi.formatNumber(od.price * sign * -1, true)}* ${market} ✅`)
    } else if (od.type === BittrexOrder.ORDER_TYPE.IMMEDIATE) {
      if (od.status === BittrexOrder.Status.PREPARE) od.price = lastPrice
    } else if (od.type === BittrexOrder.ORDER_TYPE.BOT) {
      if (od.status === BittrexOrder.Status.PREPARE) od.price = od.firstPrice
      msgs.push(`*📍Bot*       *${BittrexApi.formatNumber((od.price + od.bufferRate) * sign * -1, true)}* ${market} 👻`)
      msgs.push(`                      _${BittrexApi.formatNumber(od.firstPrice)} ${market}_`)
      if (od.bufferRate !== 0)
        msgs.push(`                    _+-${BittrexApi.formatNumber(od.bufferRate)} ${market}_`)
    }
    const quantity = od.getQuantity()
    const total = od.getTotal()
    msgs.push(`*Quantity*  ${BittrexApi.formatNumber(quantity * sign, true)} ${coin}`)
    msgs.push(`        *Total*  ${BittrexApi.formatNumber(total * sign * -1, true)} ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      if (od.action === BittrexOrder.Action.BUY) {
        msgs.push(`💰 *${coin}* = ${BittrexApi.formatNumber(wbs.Available)} 🔜 *${BittrexApi.formatNumber(wbs.Available + quantity)}* `)
        msgs.push(`💰 *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available - total)}* `)
        if (w.Available < total) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (od.price > lastPrice) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price > last price ??? 😱_')
        }
      } else {
        msgs.push(`💰 *${coin}* = ${BittrexApi.formatNumber(wbs.Available)} 🔜 *${BittrexApi.formatNumber(wbs.Available - quantity)}*`)
        msgs.push(`💰 *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available + total)}*`)
        if (wbs.Available < quantity) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (od.price < lastPrice) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price < last price ??? 😱_')
        }
      }
    }
    if (od.error) {
      let error = od.error
      if (!(error instanceof Array)) error = [error]
      msgs.push(`----------------------------------------------`)
      msgs.push(error.map(e => `☠️ ${e.replace(/_/g, ' ')}`).join('\n'))
    }
    if (od.success) {
      let success = od.success
      if (!(success instanceof Array)) success = [success]
      msgs.push(`----------------------------------------------`)
      msgs.push(success.map(e => `👍 ${e.replace(/_/g, ' ')}`).join('\n'))
    }
    return { msgs, isOk }
  }

  private static registerBuySell() {
    BittrexOrder.Bot.action(/order:(yes|no|bot|bid|immediate|cancel|botcancel) .+/, async (ctx) => {
      const { editMessageText, match, from } = ctx
      try {
        const [action, key, _id, type, last] = match[0].split(' ')
        const od = BittrexOrder.orders[key].find(e => e._id === _id)
        if (action === 'order:bid') {
          od.type = BittrexOrder.ORDER_TYPE.BID
          await BittrexOrder.save(key)
        } else if (action === 'order:immediate') {
          od.type = BittrexOrder.ORDER_TYPE.IMMEDIATE
          await BittrexOrder.save(key)
        } else if (action === 'order:bot') {
          od.type = BittrexOrder.ORDER_TYPE.BOT
          await BittrexOrder.save(key)
        } else if (action === 'order:yes') {
          if (type === BittrexOrder.ORDER_TYPE.BID || type === BittrexOrder.ORDER_TYPE.IMMEDIATE) {
            if (type === BittrexOrder.ORDER_TYPE.IMMEDIATE)
              od.price = +last
            const quantity = od.getQuantity()
            const user = BittrexUser.get(from.id.toString())
            let rs
            if (od.action === BittrexOrder.Action.SELL)
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
        } else if (action === 'order:cancel') {
          const user = BittrexUser.get(from.id.toString())
          await BittrexOrder.remove(key, od._id)
          await user.cancel(od.orderId)
          await BittrexOrder.Bot.editMessageReplyMarkup(od.chatId, od.messageId, undefined, {
            inline_keyboard: [[{ text: 'THIS ORDER WAS CANCELED 🚫', url: 'https://bittrex.com/History' }]]
          })
        } else if (action === 'order:botcancel') {
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
        let [action, key, quantity, price, bufferRate] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        price = BittrexApi.getQuickPrice(price)
        const type = action === '/buy' ? BittrexOrder.Action.BUY : BittrexOrder.Action.SELL
        bufferRate = BittrexApi.getQuickPrice(bufferRate || '0')

        const [market, coin] = key.split('-')
        const rs = await reply(`Ordering ${key}`)
        const balances = Cached.balances[from.id.toString()]
        const w = balances.find(e => e.Currency === market) || { Available: 0 }
        const wbs = type === BittrexOrder.Action.BUY ? (balances.find(e => e.Currency === coin) || { Available: 0 }) : (balances.find(e => e.Currency === coin) || { Available: 0 })
        await BittrexOrder.add(undefined, from.id.toString(), chat.id, rs.message_id, key, quantity, price, bufferRate, type, BittrexOrder.ORDER_TYPE.BID, BittrexOrder.Status.PREPARE, undefined, w, wbs, undefined, undefined)
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static async registerMyOrders() {
    BittrexOrder.Bot.command('order', async (ctx) => {
      const { from, reply, chat } = ctx
      try {
        const user = BittrexUser.get(from.id.toString())
        const orders = await user.getMyOrders()
        let isHasOrder
        for (let key in BittrexOrder.orders) {
          const ods = BittrexOrder.orders[key]
          for (let i = ods.length - 1; i >= 0; i--) {
            const od = ods[i]
            if (od.user === from.id.toString()) {
              try { await BittrexOrder.Bot.deleteMessage(od.chatId, od.messageId) } catch (e) { }
              if (od.orderId) {
                const o = orders.find(e => e.Exchange === key)
                if (o) {
                  const price = o.Limit
                  const quantity = o.Quantity
                  let status
                  let error
                  let success
                  if (o.CancelInitiated) {
                    status = BittrexOrder.Status.CANCELED
                    success = `🚫 CANCELED IT`
                  } else if (o.Closed) {
                    status = BittrexOrder.Status.DONE
                    success = `OK, GOT IT 👍`
                  } else {
                    status = BittrexOrder.Status.WAITING
                  }
                  const type = o.OrderType === 'LIMIT_BUY' ? BittrexOrder.Action.BUY : BittrexOrder.Action.SELL
                  const rs = await reply(`Reloading order ${key}`)
                  await BittrexOrder.add(undefined, from.id.toString(), chat.id, rs.message_id, key, quantity, price, 0, type, BittrexOrder.ORDER_TYPE.BID, status, o.OrderUuid, undefined, undefined, error, success)
                  isHasOrder = true
                }
              } else {
                const rs = await reply(`Reloading order ${key}`)
                od.chatId = chat.id
                od.messageId = rs.message_id
                isHasOrder = true
              }
            }
          }
          await BittrexOrder.save(key)
        }
        if (!isHasOrder) await reply('Have no any order')
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }
}
