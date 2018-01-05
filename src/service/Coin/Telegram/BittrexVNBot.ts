import { BotCommand } from './Telegram'
import BittrexApi from '../Bittrex/BittrexApi'
import BittrexUser from '../Bittrex/BittrexUser'
import BittrexAlert from '../Bittrex/BittrexAlert'
import * as Extra from 'telegraf/extra'
import RawTrading from '../Crawler/RawHandler'
// import * as Markup from 'telegraf/markup'

export default class BittrexVNBot {

  static Bot = new BotCommand(AppConfig.app.telegram.BittrexVNBot)

  static async init() {
    await Promise.all([
      BittrexUser.reloadFromCached(),
      BittrexAlert.reloadFromCached()
    ])
    // Refer https://github.com/telegraf/telegraf/blob/develop/docs/examples/keyboard-bot.js
    BittrexVNBot.registerLogin()
    BittrexVNBot.registerGetMyWalletStatus()
    BittrexVNBot.registerGetMyWalletID()
    BittrexVNBot.registerGetRate()
    BittrexVNBot.registerGetCoinInfo()
    BittrexVNBot.registerAddAlert()
    BittrexVNBot.registerGetAlerts()
    BittrexVNBot.registerRmAlert()
    BittrexVNBot.registerClearAlert()
    BittrexVNBot.registerBuy()
    BittrexVNBot.registerSell()
    BittrexVNBot.registerLSBuy()
    BittrexVNBot.registerLSSell()
    BittrexVNBot.registerMyOrders()
    BittrexVNBot.registerStart()
  }

  private static registerStart() {
    BittrexVNBot.Bot.start(async (ctx) => {
      const { reply, chat } = ctx
      await reply(`[${chat.id}] Welcome to BittrexBotVN!`)
    })
    BittrexVNBot.Bot.startPolling()
  }

  private static registerLogin() {
    BittrexVNBot.Bot.command('login', async (ctx) => {
      const { reply, from, message, chat, deleteMessage } = ctx
      const [, apikey, secretKey] = message.text.split(' ')
      if (!apikey) return await reply('Apikey is required')
      if (!secretKey) return await reply('SecretKey is required')
      await BittrexUser.add(from.id.toString(), apikey, secretKey, chat.id)
      await deleteMessage()
      await reply(`[${from.id}] Hi ${from.first_name} ${from.last_name}.\nYour account is registed via bittrex apikey`)
    })
  }

  private static async registerMyOrders() {
    BittrexVNBot.Bot.action(/order:cancel .+/, async (ctx) => {
      const { editMessageText, match, from } = ctx
      try {
        const [, orderId] = match[0].split(' ')

        const user = BittrexUser.users[from.id.toString()]
        if (!user) throw new Error('User has not login yet')

        await user.cancel(orderId)
        await user.removeOrder(orderId)

        await editMessageText(`🚫 Canceled the order`)
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexVNBot.Bot.command('order', async (ctx) => {
      const { replyWithMarkdown, from, reply } = ctx
      try {
        const orders = await BittrexUser.getMyOrders(from.id.toString(), '')
        if (orders.length === 0) return await reply('Have no any order')
        const balances = await BittrexUser.getMyBalances(from.id.toString())
        for (let o of orders) {
          const od = await BittrexUser.getMyOrder(from.id.toString(), o.OrderUuid) as any
          const key = od.Exchange
          const price = od.Limit
          const quantity = od.Quantity
          const commission = od.CommissionReserved
          const [market, coin] = key.split('-')
          const w = balances.find(e => e.Currency === market)
          const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
          const subTotal = +(quantity * price).toFixed(8)
          const total = +(subTotal + commission).toFixed(8)

          const { msgs, isOk } = od.Type === 'LIMIT_BUY' ? await BittrexVNBot.formatBuyForm(key, quantity, price, subTotal, commission, total, w, wbuy, false) : await BittrexVNBot.formatSellForm(key, quantity, price, subTotal, commission, total, w, wbuy, false)
          await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
            m.callbackButton('🚫 CANCEL THIS ORDER', `order:cancel ${o.OrderUuid}`),
          ])))
        }
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerLSSell() {
    BittrexVNBot.Bot.action(/lssell:(pagi) .+/, async (ctx) => {
      const { editMessageText, reply, match, from } = ctx
      try {
        let [, key, page, recordsPerPage] = match[0].split(' ')
        page = +page
        recordsPerPage = +recordsPerPage
        let msgs = await BittrexVNBot.getOrderBook(from.id.toString(), key, page, recordsPerPage, 'sell')
        return await editMessageText(msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([1, 2, 3, 4, 5].map(e => {
          return m.callbackButton(`${e}${e === page ? '✔️' : ''}`, `lssell:pagi ${key} ${e} ${recordsPerPage}`)
        }))))
      } catch (e) {
        await reply(e.message || e)
      }
    })
    BittrexVNBot.Bot.command('lssell', async (ctx) => {
      const { reply, message, from, replyWithMarkdown } = ctx
      try {
        let [, key, page = 1, recordsPerPage = 10] = message.text.split(' ')
        page = +page
        recordsPerPage = +recordsPerPage
        if (!key) return await reply('Not found market-coin')
        let msgs = await BittrexVNBot.getOrderBook(from.id.toString(), key, page, recordsPerPage, 'sell')
        return await replyWithMarkdown(msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([1, 2, 3, 4, 5].map(e => {
          return m.callbackButton(`${e}${e === page ? '✔️' : ''}`, `lssell:pagi ${key} ${e} ${recordsPerPage}`)
        }))))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerLSBuy() {
    BittrexVNBot.Bot.action(/lsbuy:(pagi) .+/, async (ctx) => {
      const { editMessageText, reply, match, from } = ctx
      try {
        let [, key, page, recordsPerPage] = match[0].split(' ')
        page = +page
        recordsPerPage = +recordsPerPage
        let msgs = await BittrexVNBot.getOrderBook(from.id.toString(), key, page, recordsPerPage, 'buy')
        return await editMessageText(msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([1, 2, 3, 4, 5].map(e => {
          return m.callbackButton(`${e}${e === page ? '✔️' : ''}`, `lsbuy:pagi ${key} ${e} ${recordsPerPage}`)
        }))))
      } catch (e) {
        await reply(e.message || e)
      }
    })
    BittrexVNBot.Bot.command('lsbuy', async (ctx) => {
      const { reply, message, from, replyWithMarkdown } = ctx
      try {
        let [, key, page = 1, recordsPerPage = 10] = message.text.split(' ')
        page = +page
        recordsPerPage = +recordsPerPage
        if (!key) return await reply('Not found market-coin')
        let msgs = await BittrexVNBot.getOrderBook(from.id.toString(), key, page, recordsPerPage, 'buy')
        return await replyWithMarkdown(msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([1, 2, 3, 4, 5].map(e => {
          return m.callbackButton(`${e}${e === page ? '✔️' : ''}`, `lsbuy:pagi ${key} ${e} ${recordsPerPage}`)
        }))))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static async formatBuyForm(key, quantity, price, subTotal, commission, total, w, wbuy, isCheckWallet) {
    const [market, coin] = key.split('-')
    const newestTrading = await RawTrading.getTradings()
    const trading = newestTrading.find(e => e.key === key)
    if (!trading) throw `Could not found price of "${key}"`

    const msgs = []
    msgs.push(`*BUYING FORM DETAILS*`)
    msgs.push(`----------------------------------------------`)
    msgs.push(`*Market*              ${key}`)
    msgs.push(`*Quantity*           *+${BittrexApi.formatNumber(quantity)}* ${coin}`)
    msgs.push(`*Price*                   *${BittrexApi.formatNumber(price)}* ${market}`)
    msgs.push(`                             *${BittrexApi.formatNumber(trading.last)}* ${market}📌`)
    msgs.push(`*Total*                  *-${BittrexApi.formatNumber(total)}* ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Your balances 💰*`)
      msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wbuy.Available)} 🔜 *${BittrexApi.formatNumber(wbuy.Available + quantity)}*`)
      msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available + total)} 🔜 *${BittrexApi.formatNumber(w.Available)}*`)
      if (isCheckWallet && w.Available < total) {
        msgs.push(`----------------------------------------------`)
        msgs.push('_😱 Insufficient funds_')
        isOk = false
      }
      msgs.push(`----------------------------------------------`)
    }
    return { msgs, isOk }
  }

  private static async formatSellForm(key, quantity, price, subTotal, commission, total, w, wsell, isCheckWallet) {
    const [market, coin] = key.split('-')
    const newestTrading = await RawTrading.getTradings()
    const trading = newestTrading.find(e => e.key === key)
    if (!trading) throw `Could not found price of "${key}"`

    const msgs = []
    msgs.push(`*SELLING FORM DETAILS*`)
    msgs.push(`----------------------------------------------`)
    msgs.push(`*Market*              ${key}`)
    msgs.push(`*Quantity*           *-${BittrexApi.formatNumber(quantity)}* ${coin}`)
    msgs.push(`*Price*                   *${BittrexApi.formatNumber(price)}* ${market}`)
    msgs.push(`                             *️${BittrexApi.formatNumber(trading.last)}* ${market}📌`)
    msgs.push(`*Total*                  *+${BittrexApi.formatNumber(total)}* ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Your balances 💰*`)
      msgs.push(`   *${coin}* = ${BittrexApi.formatNumber(wsell.Available)} 🔜 *${BittrexApi.formatNumber(wsell.Available - quantity)}*`)
      msgs.push(`   *${market}* = ${BittrexApi.formatNumber(w.Available)} 🔜 *${BittrexApi.formatNumber(w.Available + total)}*`)
      if (isCheckWallet && wsell.Available < quantity) {
        msgs.push(`----------------------------------------------`)
        msgs.push('_😱 Insufficient funds_')
        isOk = false
      }
      msgs.push(`----------------------------------------------`)
    }
    return { msgs, isOk }
  }

  private static registerBuy() {
    BittrexVNBot.Bot.action(/buy:(yes|no) .+/, async (ctx) => {
      const { editMessageText, editMessageReplyMarkup, reply, match, from, chat, callbackQuery } = ctx
      try {
        const [action, ...prms] = match[0].split(' ')
        if (action === 'buy:yes') {
          const [key, quantity, price, type] = prms
          if (key && quantity && price) {
            const user = BittrexUser.users[from.id.toString()]
            if (!user) throw new Error('User has not login yet')

            const rs = await user.buy(key, +quantity, +price, type) as any
            await user.addOrder(rs.OrderId, chat.id, callbackQuery.message.message_id)

            return await editMessageReplyMarkup({
              inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
            })
          }
          await reply('Market, quantity, price is required')
        } else {
          await editMessageText(`🚫 Canceled the order`)
        }
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexVNBot.Bot.command('buy', async (ctx) => {
      const { reply, message, from, replyWithMarkdown } = ctx
      try {
        // buy btc-xdn 1 1000
        let [, key, quantity, price] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        price = +price
        const [market, coin] = key.split('-')
        const rate = 0.0025
        const balances = await BittrexUser.getMyBalances(from.id.toString())
        const w = balances.find(e => e.Currency === market)
        const wbuy = balances.find(e => e.Currency === coin) || { Available: 0 }
        quantity = quantity === 'all' ? (w.Available / (price + (rate * price))) : +quantity

        const subTotal = +(quantity * price).toFixed(8)
        const commission = +(subTotal * rate).toFixed(8)
        const total = +(subTotal + commission).toFixed(8)

        const { msgs, isOk } = await BittrexVNBot.formatBuyForm(key, quantity, price, subTotal, commission, total, w, wbuy, true)

        await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
          m.callbackButton('✅ GOOD_TIL_CANCELLED', `buy:yes ${key} ${quantity} ${price} GOOD_TIL_CANCELLED`),
          m.callbackButton('🚀 IMMEDIATE', `buy:yes ${key} ${quantity} ${price} IMMEDIATE_OR_CANCEL`),
          m.callbackButton('🚫 CANCEL', `buy:no ${key}`),
        ]))
        )
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static registerSell() {
    BittrexVNBot.Bot.action(/sell:(yes|no) .+/, async (ctx) => {
      const { editMessageText, editMessageReplyMarkup, reply, match, from, chat, callbackQuery } = ctx
      try {
        const [action, ...prms] = match[0].split(' ')
        if (action === 'sell:yes') {
          const [key, quantity, price, type] = prms
          if (key && quantity && price) {
            const user = BittrexUser.users[from.id.toString()]
            if (!user) throw new Error('User has not login yet')

            const rs = await user.sell(key, +quantity, +price, type) as any
            await user.addOrder(rs.OrderId, chat.id, callbackQuery.message.message_id)

            return await editMessageReplyMarkup({
              inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `order:cancel ${rs.OrderId}` }]]
            })
          }
          await reply('Market, quantity, price is required')
        } else {
          await editMessageText(`🚫 Canceled the order`)
        }
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    BittrexVNBot.Bot.command('sell', async (ctx) => {
      const { reply, message, from, replyWithMarkdown } = ctx
      try {
        // sell btc-xdn 1 1000
        let [, key, quantity, price] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        price = +price
        const [market, coin] = key.split('-')
        const rate = 0.0025
        const balances = await BittrexUser.getMyBalances(from.id.toString())
        const w = balances.find(e => e.Currency === market)
        const wsell = balances.find(e => e.Currency === coin)
        quantity = quantity === 'all' ? wsell.Available : +quantity

        const subTotal = +(quantity * price).toFixed(8)
        const commission = +(subTotal * rate).toFixed(8)
        const total = +(subTotal + commission).toFixed(8)

        const { msgs, isOk } = await BittrexVNBot.formatSellForm(key, quantity, price, subTotal, commission, total, w, wsell, true)

        await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.markdown().markup(m => m.inlineKeyboard([
          m.callbackButton('✅ GOOD_TIL_CANCELLED', `sell:yes ${key} ${quantity} ${price} GOOD_TIL_CANCELLED`),
          m.callbackButton('🚀 IMMEDIATE', `sell:yes ${key} ${quantity} ${price} IMMEDIATE_OR_CANCEL`),
          m.callbackButton('🚫 CANCEL', `sell:no ${key}`),
        ]))
        )
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static registerAddAlert() {
    BittrexVNBot.Bot.command('nw', async (ctx) => {
      const { reply, replyWithMarkdown, from, message } = ctx
      try {
        const [kf, des] = message.text.split('\n')
        let [, key, ...formula] = kf.toUpperCase().split(' ')
        formula = formula.join('') as string
        if (!key || !formula) return await reply('Not found market-coin or formular')
        if (!formula.includes('<') && !formula.includes('>') && !formula.includes('=')) return await reply('Formula need includes atlest 1 in ">", "<", ">=", "<=", "=="')
        await BittrexAlert.addAlert(from.id.toString(), new BittrexAlert(key, formula, des))
        const tmp = await BittrexVNBot.getAlertMsgs(from.id.toString(), key)
        if (tmp.length === 0) return await reply('No alert')
        await replyWithMarkdown(tmp.join('\n'))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerGetAlerts() {
    BittrexVNBot.Bot.command('ls', async (ctx) => {
      const { reply, replyWithMarkdown, from, message } = ctx
      try {
        const alert = BittrexAlert.getAlerts(from.id.toString())
        if (!alert || Object.keys(alert).length === 0) return await reply('No alert')
        let [, _key] = message.text.split(' ')
        if (_key) _key = _key.toUpperCase()
        const tmp = await BittrexVNBot.getAlertMsgs(from.id.toString(), _key)
        if (tmp.length === 0) return await reply('No alert')
        await replyWithMarkdown(tmp.join('\n'))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerRmAlert() {
    BittrexVNBot.Bot.command('rm', async (ctx) => {
      const { reply, replyWithMarkdown, from, message } = ctx
      try {
        let [, key, i] = message.text.split(' ')
        if (!key) return await reply('Not found Market-Coin')
        if (i === undefined) return await reply('Not found index to remove')
        key = key.toUpperCase()
        await BittrexAlert.rmAlert(from.id.toString(), key, +i)
        const tmp = await BittrexVNBot.getAlertMsgs(from.id.toString(), key)
        if (tmp.length === 0) return await reply('No alert')
        await replyWithMarkdown(tmp.join('\n'))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerClearAlert() {
    BittrexVNBot.Bot.command('cls', async (ctx) => {
      const { reply, replyWithMarkdown, from, message } = ctx
      try {
        let [, key] = message.text.split(' ')
        if (key) key = key.toUpperCase()
        await BittrexAlert.rmAlert(from.id.toString(), key, -1)
        const tmp = await BittrexVNBot.getAlertMsgs(from.id.toString(), undefined)
        if (tmp.length === 0) return await reply('No alert')
        await replyWithMarkdown(tmp.join('\n'))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerGetCoinInfo() {
    BittrexVNBot.Bot.hears(/^#.+$/i, async (ctx) => {
      const { reply, replyWithMarkdown, message } = ctx
      try {
        let coin = message.text.split('#')[1];
        if (!coin) return await reply('Not found coin')
        coin = coin.toUpperCase()
        const txt = [`*#${coin} DETAILS*\n-----------------------------------------`]
        const newestTrading = await RawTrading.getTradings()
        for (const c of newestTrading) {
          if (c.name === coin) {
            txt.push(`*${c.key}* = ${BittrexApi.formatNumber(c.last)} `)
          }
        }
        if (txt.length > 0) return await replyWithMarkdown(txt.join('\n'))
        await reply('Could not found this coin')
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerGetRate() {
    BittrexVNBot.Bot.command('rate', async (ctx) => {
      const { replyWithMarkdown, reply } = ctx
      try {
        const rate = await RawTrading.getRate()
        const msgs = [
          `*RATE*\n-----------------------------------------`,
          `*1 BTC* = ${BittrexApi.formatNumber(rate['BTC-USDT'])} *USDT*`,
          `*1 ETH* = ${BittrexApi.formatNumber(rate['ETH-USDT'])} *USDT*`,
          `*1 BTC* = ${BittrexApi.formatNumber(rate['BTC-ETH'])} *ETH*`
        ]
        await replyWithMarkdown(msgs.join('\n'))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerGetMyWalletStatus() {
    BittrexVNBot.Bot.command('wallet', async (ctx) => {
      const { replyWithMarkdown, from, reply } = ctx
      try {
        const balances = await BittrexUser.getMyBalances(from.id.toString())
        const msg = [`*WALLETS*\n-----------------------------------------`, ...balances.filter(e => e.Available || e.Balance).map(e => {
          let msgs = [`*${e.Currency}* = ${BittrexApi.formatNumber(e.Balance)} `]
          if (e.Available && e.Available !== e.Balance) msgs.push(`  - Available ~${BittrexApi.formatNumber(e.Available)} `)
          return msgs.join('\n')
        })].join('\n')
        await replyWithMarkdown(msg)
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerGetMyWalletID() {
    BittrexVNBot.Bot.command('walletid', async (ctx) => {
      const { replyWithMarkdown, from, reply } = ctx
      try {
        const balances = await BittrexUser.getMyBalances(from.id.toString())
        const msg = balances.filter(e => e.Available).map(e => `*${e.Currency}* _${e.CryptoAddress || ''}_`).join('\n')
        await replyWithMarkdown(msg)
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  // private static async suggestPrice(data) {
  //   const last30 = data.splice(0, 30)
  //   let mid = []
  //   let max = [] as any[]
  //   last30.map((e, i) => {
  //     e.i = i
  //     return e
  //   }).sort((a, b) => b.Quantity - a.Quantity)

  // }

  private static async getOrderBook(username: string, key: string, page = 1, recordsPerPage = 10, type: 'sell' | 'buy') {
    const formatMessages = (data) => {
      let max = 0
      let maxI = -1
      return [...data.slice((page - 1) * recordsPerPage, page * recordsPerPage).map((e, i) => {
        if (e.Quantity > max) {
          max = e.Quantity
          maxI = i
        }
        return e
      }).map((e, i0) => {
        let i = ((page - 1) * recordsPerPage) + i0 + 1
        return ` *${i > 9 ? i : ('0' + i)}.* ${maxI === i0 ? '*' : ''}📯${BittrexApi.formatNumber(e.Quantity)}${maxI === i0 ? '*' : ''} 💰${BittrexApi.formatNumber(e.Rate)}`
      })]
    }
    const user = BittrexUser.users[username]
    if (!user) throw new Error('User has not login yet')

    const orders = await user.getOrderBook(key, type)
    let msgs = [
      `*LASTEST ORDER ${type === 'buy' ? 'BUYING' : 'SELLING'} BOOKS*`,
      '----------------------------------------------',
      ...formatMessages(orders)
    ]
    return msgs
  }

  private static async getAlertMsgs(username: string, _key: string) {
    const tmp = []
    const alert = BittrexAlert.getAlerts(username)
    if (!alert || Object.keys(alert).length === 0) return tmp
    for (let key in alert) {
      if (_key && key !== _key) continue
      if (tmp.length === 0) {
        tmp.push(`*ALERTS*\n-----------------------------------------`)
      }
      const newestTrading = await RawTrading.getTradings()
      const f = newestTrading.find(e => e.key === key)
      tmp.push(`*${key}* = ${f ? BittrexApi.formatNumber(f.last) : ''}`)
      tmp.push(alert[key].map((e, i) => ` ${i} | * $${e.formula}* | _${e.des || ''} _`).join('\n'))
      tmp.push('')
    }
    return tmp
  }

}