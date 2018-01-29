import * as Telegraf from 'telegraf'
import { User } from '../User';
import { Order } from '../Order';
import RawHandler from '../Crawler/RawHandler';
import HttpError from '../../common/HttpError';
import * as Extra from 'telegraf/extra'
import Utils from '../../common/Utils';

export default class OrderCommand {
  static readonly Bot = new Telegraf('522630929:AAFb6U5YAFwCi1aifvYyPf_Qy-ORRG4eOtg')

  static async init() {
    await OrderCommand.initCommand()
  }

  static getMenuCommand() {
    return ['/order']
  }

  static async runBackground() {
    const tradings = await RawHandler.getTradings()
    for (const user of User.users) {
      for (const od of user.orders) {
        switch (od.status) {
          case Order.Status.NEW:
            const t = tradings.find(e => e.key === od.key)
            if (t) {
              const { msgs } = Order.formatOrderForm(t, od, od.w, od.wbs)
              await OrderCommand.Bot.telegram.editMessageText(od.chatId, od.messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([
                [
                  m.callbackButton(`✅ BID ${od.type === Order.Type.BID ? '✔️' : ''}`, `order:bid ${od.id}`),
                  m.callbackButton(`🚀 NOW ${od.type === Order.Type.NOW ? '✔️' : ''}`, `order:now ${od.id}`),
                  m.callbackButton(`👻 BOT ${od.type === Order.Type.BOT ? '✔️' : ''}`, `order:bot ${od.id}`),
                ],
                [
                  m.callbackButton(`${od.action === Order.Action.SELL ? 'SELL' : 'BUY'} 👍`, `order:yes ${od.id}`),
                  m.callbackButton('🚫 CANCEL', `order:no ${od.id}`)
                ]
              ])))
            }
            break
          case Order.Status.WAITING:
            let msgs
            if (od.orderId) {
              // Order in bittrex
              const oder = await user.getBittrexOrder(od)
              if (oder.IsOpen) {
                const t = tradings.find(e => e.key === od.key)
                if (od.action === Order.Action.BUY) {
                  const rs = await Order.formatOrderForm(t, od, undefined, undefined)
                  msgs = rs.msgs
                } else {
                  const rs = await Order.formatOrderForm(t, od, undefined, undefined)
                  msgs = rs.msgs
                }
                await OrderCommand.Bot.telegram.editMessageText(od.chatId, od.messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([
                  m.callbackButton('🚫 CANCEL ORDER', `order:cancel ${od.id}`),
                ])))
              } else {
                if (oder.CancelInitiated) {
                  await OrderCommand.Bot.telegram.editMessageText(od.chatId, od.messageId, undefined, `🚫 Order [${od.key}](https://bittrex.com/Market/Index?MarketName=${od.key}) ${od.action === Order.Action.BUY ? 'buy' : 'sell'} *${od.getQuantity()}* statoshi with price *${od.price}* was canceled`, { parse_mode: 'Markdown' })
                } else {
                  if (oder.ImmediateOrCancel && oder.Quantity === oder.QuantityRemaining) {
                    od.success.push(`THIS ORDER IS MISSED 💢`)
                  } else {
                    od.success.push(`THIS ORDER HAS DONE 👍`)
                  }
                }
              }
            } else {
              // Order by My bot
              const t = tradings.find(e => e.key === od.key)
              t.last = od.action === Order.Action.SELL ? t.ask : t.bid
              if (od.canBeOrder(t.last)) {
                try { await OrderCommand.Bot.telegram.deleteMessage(od.chatId, od.messageId) } catch (_e) { }
                let ors = {} as any
                let rs
                try {
                  if (od.action === Order.Action.SELL) {
                    rs = await OrderCommand.Bot.telegram.send(od.chatId, `Bot selled ${od.quantity} ${od.key} with price ${Utils.formatNumber(t.last)}/${Utils.formatNumber(od.price)}`)
                    ors = await user.sell(od) as any
                  } else {
                    rs = await OrderCommand.Bot.telegram.send(od.chatId, `Bot bought ${od.quantity} ${od.key} with price ${Utils.formatNumber(t.last)}/${Utils.formatNumber(od.price)}`)
                    ors = await user.buy(od) as any
                  }
                } catch (e) {
                  od.status = Order.Status.FAILED
                  od.error.push(e.message)
                }
                od.messageId = rs.message_id
                od.orderId = ors.OrderId
                await user.save()
              } else {
                const rs = await Order.formatOrderForm(t, od, undefined, undefined)
                msgs = rs.msgs
                await OrderCommand.Bot.telegram.editMessageText(od.chatId, od.messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([
                  m.callbackButton('🚫 CANCEL ORDER', `order:cancel ${od.id}`)
                ])))
              }
            }
            break
          case Order.Status.CANCELED:
            await user.removeOrder(od)
            await OrderCommand.Bot.telegram.editMessageText(od.chatId, od.messageId, undefined, `🚫 Canceled order [${od.key}](https://bittrex.com/Market/Index?MarketName=${od.key}) buy *${od.getQuantity()}* coins with price *${od.price}*`, Extra.markdown())
            break
        }
      }
    }
    setTimeout(OrderCommand.runBackground, 5000)
  }

  static initCommand() {
    OrderCommand.Bot.hears(/^\/login ([^\s]+) ([^\s]+)/, async ({ deleteMessage, match, from, reply }) => {
      try {
        const [, apikey, apisecret] = match
        if (!apikey || !apisecret) throw HttpError.BAD_REQUEST('apikey and apisecret is required')
        await User.add({
          id: from.id,
          apikey,
          apisecret
        } as User)
        await deleteMessage()
        await reply('Login successfully')
      } catch (e) {
        reply(e.message)
      }
    })
    OrderCommand.Bot.hears(/^\/order/, async ({ from, reply, chat }) => {
      try {
        const user = User.get(from.id)
        const bitOrder = await user.getMyOrders()
        const orders = user.orders
        if (bitOrder.length === 0 && orders.length === 0) throw HttpError.NOT_FOUND('Have no any orders')
        for (let bo of bitOrder) {
          const o = orders.find(e => e.orderId === bo.OrderUuid)
          if (!o) {
            const rs = await reply(`Reloading ${bo.Exchange}`)
            user.addOrder({
              key: bo.Exchange,
              quantity: bo.Quantity,
              price: bo.Limit,
              firstPrice: bo.Limit,
              chatId: chat.id,
              orderId: bo.OrderUuid,
              messageId: rs.message_id,
              action: Order.Action.BUY
            } as Order)
          } else {
            try { await OrderCommand.Bot.telegram.deleteMessage(o.chatId, o.messageId) } catch (_e) { }
            const rs = await reply(`Reloading ${bo.Exchange}`)
            o.messageId = rs.message_id
          }
        }
        await user.save()
      } catch (e) {
        reply(e.message)
      }
    })
    OrderCommand.Bot.action(/order:(yes|no|bot|bid|now|cancel) .+/, async (ctx) => {
      const { editMessageText, match, from } = ctx
      let o: Order
      try {
        const [action, id] = match[0].split(' ')
        const user = User.get(from.id)
        o = user.orders.find(e => e.id === id)
        o.error = []
        if (action.includes('order:bid')) {
          o.type = Order.Type.BID
          await user.save()
        } else if (action.includes('order:now')) {
          o.type = Order.Type.NOW
          await user.save()
        } else if (action.includes('order:bot')) {
          o.type = Order.Type.BOT
          await user.save()
        } else if (action.includes('order:yes')) {
          if (o.type === Order.Type.BID || o.type === Order.Type.NOW) {
            let rs
            if (o.action === Order.Action.SELL)
              rs = await user.sell(o) as any
            else
              rs = await user.buy(o) as any
            o.orderId = rs.OrderId
            o.status = Order.Status.WAITING
            await user.save()
          } else if (o.type === Order.Type.BOT) {
            o.orderId = undefined
            o.status = Order.Status.WAITING
            await user.save()
          }
        } else if (action.includes('order:cancel')) {
          o.status = Order.Status.CANCELED
          await user.save()
        } else {
          o.status = Order.Status.CANCELED
          await user.save()
        }
      } catch (e) {
        o.status = Order.Status.FAILED
        if (o) o.error.push(e.message)
        else editMessageText(e.message)
      }
    })
    OrderCommand.Bot.hears(/^\/(buy|sell) ([^\s]+) ([^\s]+) ([.\d]+)/i, async ({ from, match, reply, chat }) => {
      try {
        let [, action, key, quantity, price] = match
        key = key.toUpperCase()
        const user = User.get(from.id)
        const [market, coin] = key.split('-')
        const balances = await user.getMyBalances()
        const w = balances.find(e => e.Currency === market) || { Available: 0 }
        const rs = await reply(`Ordering ${key}`)
        price = Utils.getQuickPrice(price)
        if (action === 'buy') {
          await user.addOrder({
            key,
            quantity,
            price,
            firstPrice: price,
            w,
            chatId: chat.id,
            messageId: rs.message_id,
            action: Order.Action.BUY,
            wbs: (balances.find(e => e.Currency === coin) || { Available: 0 })
          } as Order)
        } else {
          await user.addOrder({
            key,
            quantity,
            price,
            firstPrice: price,
            w,
            chatId: chat.id,
            messageId: rs.message_id,
            action: Order.Action.SELL,
            wbs: (balances.find(e => e.Currency === coin) || { Available: 0 })
          } as Order)
        }
      } catch (e) {
        reply(e.message)
      }
    })
    OrderCommand.Bot.startPolling()
  }

}