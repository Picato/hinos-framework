import { BotCommand } from '../Telegram'
import BittrexApi from './BittrexApi'
import BittrexUser from './BittrexUser'
import BittrexAlert from './BittrexAlert'
import * as Extra from 'telegraf/extra'
// import * as Markup from 'telegraf/markup'

export class TelegramCommand {
  static Bot = new BotCommand(AppConfig.app.bittrex.telegramBot)

  static async init() {
    await Promise.all([
      BittrexUser.reloadFromCached(),
      BittrexAlert.reloadFromCached()
    ])
    TelegramCommand.Bot.command('login', async ({ reply, from, message }) => {
      const apikey = message.text.split(' ')[1]
      if (!apikey) return await reply('Apikey is required')
      await BittrexUser.add(from.username, apikey)
      await reply(`Registed bittrex apikey\nLet's remove your token which you have just input`)
    })
    // Refer https://github.com/telegraf/telegraf/blob/develop/docs/examples/keyboard-bot.js
    // const Extra = require('telegraf/extra')
    // const Markup = require('telegraf/markup')
    // TelegramCommand.Bot.command('help', (ctx) => {
    //   return ctx.reply('Action support', Markup
    //     .keyboard([
    //       ['/rate', '/ls']
    //     ])
    //     .oneTime()
    //     .resize()
    //     .extra()
    //   )
    // })
    // TelegramCommand.Bot.action('rate', (_ctx) => {
    //   console.log('ok')
    // })
    TelegramCommand.Bot.start(async (ctx) => {
      const { from, reply } = ctx
      BittrexAlert.GROUP_ID = from.id
      await reply('Welcome to Bittrex Bot!')
    })

    // TelegramCommand.Bot.on('inline_query', async ({ inlineQuery, answerInlineQuery }) => {
    //   const offset = parseInt(inlineQuery.offset) || 0
    //   return answerInlineQuery([], { next_offset: offset + 30 })
    // })

    await TelegramCommand.registerGetMyWalletStatus()
    await TelegramCommand.registerGetMyWalletID()
    await TelegramCommand.registerGetRate()
    await TelegramCommand.registerGetCoinInfo()
    await TelegramCommand.registerAddAlert()
    await TelegramCommand.registerGetAlerts()
    await TelegramCommand.registerRmAlert()
    await TelegramCommand.registerClearAlert()
    await TelegramCommand.registerBuy()
    await TelegramCommand.registerSell()
    TelegramCommand.Bot.startPolling()
  }

  static async registerBuy() {
    TelegramCommand.Bot.action(/buy:(yes|no|cancel) .+/, async (ctx) => {
      const { editMessageText, editMessageReplyMarkup, reply, match, from, chat, callbackQuery } = ctx
      try {
        const [action, ...prms] = match[0].split(' ')
        if (action === 'buy:yes') {
          const [key, quantity, price, type] = prms
          if (key && quantity && price) {
            const user = BittrexUser.users[from.username]
            if (!user) throw new Error('User has not login yet')

            const rs = await user.buy(key, +quantity, +price, type) as any
            await user.addOrder(rs.OrderId, chat.id, callbackQuery.message.message_id)

            return await editMessageReplyMarkup({
              inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `buy:cancel ${rs.OrderId}` }]]
            })
          }
          await reply('Market, quantity, price is required')
        } else if (action === 'buy:cancel') {
          const [orderId] = prms

          const user = BittrexUser.users[from.username]
          if (!user) throw new Error('User has not login yet')

          await user.cancel(orderId)
          await user.removeOrder(orderId)

          await editMessageText(`🚫 Canceled the order`)
        } else {
          await editMessageText(`🚫 Canceled the order`)
        }
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    TelegramCommand.Bot.command('buy', async (ctx) => {
      const { reply, message, from, replyWithMarkdown } = ctx
      try {
        // buy btc-xdn 1 1000
        let [, key, quantity, price] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        quantity = +quantity
        price = +price
        const [market, coin] = key.split('-')
        const subTotal = quantity * price
        const commission = 0.25 * subTotal / 100
        const total = subTotal + commission
        const msgs = []
        msgs.push(`*BUYING FORM DETAILS*`)
        msgs.push(`----------------------------------------------`)
        msgs.push(`Market:               ${key}`)
        msgs.push(`Quantity:            ${BittrexApi.formatNumber(quantity)} ${coin}`)
        msgs.push(`Price:                    ${BittrexApi.formatNumber(price)} ${market}`)
        msgs.push(`Subtotal:             ${BittrexApi.formatNumber(subTotal)} ${market}`)
        msgs.push(`Commission:     ${BittrexApi.formatNumber(commission)} ${market}`)
        msgs.push(`Total:                    ${BittrexApi.formatNumber(total)} ${market}`)
        const balances = await BittrexUser.getMyBalances(from.username)
        const w = balances.find(e => e.Currency === market)
        let isOk = true
        if (w) {
          msgs.push(`----------------------------------------------`)
          msgs.push(`Your balance 💰`)
          msgs.push(` - Before: ${BittrexApi.formatNumber(w.Available)} ${market}`)
          msgs.push(` - After:   ${BittrexApi.formatNumber(w.Available - total)} ${market}`)
          if (w.Available < total) {
            msgs.push(`----------------------------------------------`)
            msgs.push('_😱 Insufficient funds_')
            isOk = false
          }
          msgs.push(`----------------------------------------------`)
        }
        await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.HTML().markup(m => m.inlineKeyboard([
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

  static async registerSell() {
    TelegramCommand.Bot.action(/sell:(yes|no|cancel) .+/, async (ctx) => {
      const { editMessageText, editMessageReplyMarkup, reply, match, from, chat, callbackQuery } = ctx
      try {
        const [action, ...prms] = match[0].split(' ')
        if (action === 'sell:yes') {
          const [key, quantity, price, type] = prms
          if (key && quantity && price) {
            const user = BittrexUser.users[from.username]
            if (!user) throw new Error('User has not login yet')

            const rs = await user.sell(key, +quantity, +price, type) as any
            await user.addOrder(rs.OrderId, chat.id, callbackQuery.message.message_id)

            return await editMessageReplyMarkup({
              inline_keyboard: [[{ text: '🚫 CANCEL THIS ORDER', callback_data: `sell:cancel ${rs.OrderId}` }]]
            })
          }
          await reply('Market, quantity, price is required')
        } else if (action === 'sell:cancel') {
          const [orderId] = prms
          const user = BittrexUser.users[from.username]
          if (!user) throw new Error('User has not login yet')

          await user.cancel(orderId)
          await user.removeOrder(orderId)

          await editMessageText(`🚫 Canceled the order`)
        } else {
          await editMessageText(`🚫 Canceled the order`)
        }
      } catch (e) {
        await editMessageText(e.message || e)
      }
    })
    TelegramCommand.Bot.command('sell', async (ctx) => {
      const { reply, message, from, replyWithMarkdown } = ctx
      try {
        // sell btc-xdn 1 1000
        let [, key, quantity, price] = message.text.split(' ')
        if (!key) return await reply('Not found market-coin')
        if (!quantity) return await reply('Not found quantity')
        if (!price) return await reply('Not found price')
        key = key.toUpperCase()
        quantity = +quantity
        price = +price
        const [market, coin] = key.split('-')
        const subTotal = quantity * price
        const commission = 0.25 * subTotal / 100
        const total = subTotal - commission
        const msgs = []
        msgs.push(`*SELLING FORM DETAILS*`)
        msgs.push(`----------------------------------------------`)
        msgs.push(`Market:               ${key}`)
        msgs.push(`Quantity:            ${BittrexApi.formatNumber(quantity)} ${coin}`)
        msgs.push(`Price:                    ${BittrexApi.formatNumber(price)} ${market}`)
        msgs.push(`Subtotal:             ${BittrexApi.formatNumber(subTotal)} ${market}`)
        msgs.push(`Commission:     ${BittrexApi.formatNumber(commission)} ${market}`)
        msgs.push(`Total:                    ${BittrexApi.formatNumber(total)} ${market}`)
        const balances = await BittrexUser.getMyBalances(from.username)
        const w = balances.find(e => e.Currency === market)
        const wsell = balances.find(e => e.Currency === coin)
        let isOk = true
        if (w) {
          msgs.push(`----------------------------------------------`)
          msgs.push(`Your balance 💰`)
          msgs.push(` - Before: ${BittrexApi.formatNumber(wsell.Available)} ${coin}`)
          msgs.push(` - After:   ${BittrexApi.formatNumber(wsell.Available - quantity)} ${coin}`)
          msgs.push('')
          msgs.push(` + Before: ${BittrexApi.formatNumber(w.Available)} ${market}`)
          msgs.push(` + After:   ${BittrexApi.formatNumber(w.Available + total)} ${market}`)
          if (wsell.Available < quantity) {
            msgs.push(`----------------------------------------------`)
            msgs.push('_😱 Insufficient funds_')
            isOk = false
          }
          msgs.push(`----------------------------------------------`)
        }
        await replyWithMarkdown(msgs.join('\n'), !isOk ? undefined : Extra.HTML().markup(m => m.inlineKeyboard([
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

  static async registerAddAlert() {
    TelegramCommand.Bot.command('nw', async (ctx) => {
      const { reply, replyWithMarkdown, from, message } = ctx
      try {
        const [kf, des] = message.text.split('\n')
        let [, key, ...formula] = kf.toUpperCase().split(' ')
        formula = formula.join('') as string
        if (!key || !formula) return await reply('Not found market-coin or formular')
        if (!formula.includes('<') && !formula.includes('>') && !formula.includes('=')) return await reply('Formula need includes atlest 1 in ">", "<", ">=", "<=", "=="')
        await BittrexAlert.addAlert(from.username, new BittrexAlert(key, formula, des))
        const tmp = TelegramCommand.getAlertMsgs(from.username, key)
        if (tmp.length === 0) return await reply('No alert')
        await replyWithMarkdown(tmp.join('\n'))
      } catch (e) {
        await reply(e)
      }
    })
  }

  static async registerGetAlerts() {
    // const Extra = require('telegraf/extra')
    // const Markup = require('telegraf/markup')
    // const markup = Extra
    //   .HTML()
    //   .markup((m) => m.inlineKeyboard([
    //     m.callbackButton('Add 1', 'add:1'),
    //     m.callbackButton('Add 10', 'add:10'),
    //     m.callbackButton('Add 100', 'add:100'),
    //     m.callbackButton('Subtract 1', 'sub:1'),
    //     m.callbackButton('Subtract 10', 'sub:10'),
    //     m.callbackButton('Subtract 100', 'sub:100'),
    //     m.callbackButton('🐈', Math.random().toString(36).slice(2)),
    //     m.callbackButton('Clear', 'clear')
    //   ], { columns: 3 }))
    // const markup = Extra.markup(
    //   Markup.inlineKeyboard([
    //     Markup.gameButton('🎮 Play now!'),
    //     Markup.urlButton('Telegraf help', 'http://telegraf.js.org')
    //   ])
    // )
    TelegramCommand.Bot.command('ls', async (ctx) => {
      const { reply, replyWithMarkdown, from, message } = ctx
      try {
        const alert = BittrexAlert.getAlerts(from.username)
        if (!alert || Object.keys(alert).length === 0) return await reply('No alert')
        let [, _key] = message.text.split(' ')
        if (_key) _key = _key.toUpperCase()
        const tmp = TelegramCommand.getAlertMsgs(from.username, _key)
        if (tmp.length === 0) return await reply('No alert')
        await replyWithMarkdown(tmp.join('\n'))
      } catch (e) {
        await reply(e)
      }
    })
  }

  static async registerRmAlert() {
    TelegramCommand.Bot.command('rm', async (ctx) => {
      const { reply, replyWithMarkdown, from, message } = ctx
      try {
        let [, key, i] = message.text.split(' ')
        if (!key) return await reply('Not found Market-Coin')
        if (i === undefined) return await reply('Not found index to remove')
        key = key.toUpperCase()
        await BittrexAlert.rmAlert(from.username, key, +i)
        const tmp = TelegramCommand.getAlertMsgs(from.username, key)
        if (tmp.length === 0) return await reply('No alert')
        await replyWithMarkdown(tmp.join('\n'))
      } catch (e) {
        await reply(e)
      }
    })
  }

  static async registerClearAlert() {
    TelegramCommand.Bot.command('cls', async (ctx) => {
      const { reply, replyWithMarkdown, from, message } = ctx
      try {
        let [, key] = message.text.split(' ')
        if (key) key = key.toUpperCase()
        await BittrexAlert.rmAlert(from.username, key, -1)
        const tmp = TelegramCommand.getAlertMsgs(from.username, undefined)
        if (tmp.length === 0) return await reply('No alert')
        await replyWithMarkdown(tmp.join('\n'))
      } catch (e) {
        await reply(e)
      }
    })
  }

  static async registerGetCoinInfo() {
    TelegramCommand.Bot.hears(/^#.+$/i, async (ctx) => {
      const { reply, replyWithMarkdown, message } = ctx
      try {
        let coin = message.text.split('#')[1];
        if (!coin) return await reply('Not found coin')
        coin = coin.toUpperCase()
        const txt = [`*#${coin} DETAILS*\n-----------------------------------------`]
        const newestTrading = BittrexApi.newestTrading
        for (const c of newestTrading) {
          if (c.name === coin) {
            txt.push(`*${c.key}* = ${BittrexApi.formatNumber(c.last)} `)
          }
        }
        if (txt.length > 0) return await replyWithMarkdown(txt.join('\n'))
        await reply('Could not found this coin')
      } catch (e) {
        await reply(e)
      }
    })
  }

  static async registerGetRate() {
    TelegramCommand.Bot.command('rate', async (ctx) => {
      const { replyWithMarkdown, reply } = ctx
      try {
        const msgs = [
          `*RATE*\n-----------------------------------------`,
          `*1 BTC* = ${BittrexApi.formatNumber(BittrexApi.rate['BTC-USDT'])} *USDT*`,
          `*1 ETH* = ${BittrexApi.formatNumber(BittrexApi.rate['ETH-USDT'])} *USDT*`,
          `*1 BTC* = ${BittrexApi.formatNumber(BittrexApi.rate['BTC-ETH'])} *ETH*`
        ]
        await replyWithMarkdown(msgs.join('\n'))
      } catch (e) {
        await reply(e)
      }
    })
  }

  static async registerGetMyWalletStatus() {
    TelegramCommand.Bot.command('wallet', async (ctx) => {
      const { replyWithMarkdown, from, reply } = ctx
      try {
        const balances = await BittrexUser.getMyBalances(from.username)
        const msg = [`*WALLETS*\n-----------------------------------------`, ...balances.filter(e => e.Available || e.Balance).map(e => {
          let msgs = [`*${e.Currency}* = ${BittrexApi.formatNumber(e.Balance)} `]
          if (e.Available && e.Available !== e.Balance) msgs.push(`  - Available ~${BittrexApi.formatNumber(e.Available)} `)
          return msgs.join('\n')
        })].join('\n')
        await replyWithMarkdown(msg)
      } catch (e) {
        await reply(e)
      }
    })
  }

  static async registerGetMyWalletID() {
    TelegramCommand.Bot.command('walletid', async (ctx) => {
      const { replyWithMarkdown, from, reply } = ctx
      try {
        const balances = await BittrexUser.getMyBalances(from.username)
        const msg = balances.filter(e => e.Available).map(e => `*${e.Currency}* _${e.CryptoAddress || ''}_`).join('\n')
        await replyWithMarkdown(msg)
      } catch (e) {
        await reply(e)
      }
    })
  }

  private static getAlertMsgs(username: string, _key: string) {
    const tmp = []
    const alert = BittrexAlert.getAlerts(username)
    if (!alert || Object.keys(alert).length === 0) return tmp
    for (let key in alert) {
      if (_key && key !== _key) continue
      if (tmp.length === 0) {
        tmp.push(`*ALERTS*\n-----------------------------------------`)
      }
      const f = BittrexApi.newestTrading.find(e => e.key === key)
      tmp.push(`*${key}* = ${f ? BittrexApi.formatNumber(f.last) : ''}`)
      tmp.push(alert[key].map((e, i) => ` ${i} | * $${e.formula}* | _${e.des || ''} _`).join('\n'))
      tmp.push('')
    }
    return tmp
  }

}