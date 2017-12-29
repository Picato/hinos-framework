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
      if (!apikey) return reply('Apikey is required')
      await BittrexUser.add(from.username, apikey)
      return reply(`Registed bittrex apikey\nLet's remove your token which you have just input`)
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
    TelegramCommand.Bot.start(({ from, reply }) => {
      BittrexAlert.GROUP_ID = from.id
      return reply('Welcome to Bittrex Bot!')
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

    TelegramCommand.Bot.startPolling()
  }

  static async registerBuy() {
    TelegramCommand.Bot.action(/buy:(yes|no|cancel)(\n(.+))?/, async (ctx) => {
      const { editMessageReplyMarkup, reply, match, from, callbackQuery, chat } = ctx
      try {
        if (match[1] === 'yes') {
          if (match[3]) {
            const [key, quantity, price] = match[3].split(' ')
            const rs = await BittrexUser.buy(from.username, key, +quantity, +price) as any
            await editMessageReplyMarkup()
            await reply('Ok, got it', Extra.HTML().markup(m => m.inlineKeyboard([
              m.callbackButton('Cancel this order', `order:cancel\n${rs.OrderId}`),
            ])))
          }
          await reply('Got problem !\nCould not order')
        } else if (match[1] === 'cancel') {
          const orderId = match[3]
          await editMessageReplyMarkup()
          return reply(`Canceled this order ${orderId}`)
        } else {
          await editMessageReplyMarkup()
          return reply('Canceled it')
        }
      } catch (e) {
        await editMessageReplyMarkup()
        await reply(e)
      }
    })
    TelegramCommand.Bot.command('buy', async (ctx) => {
      const { reply, message, from } = ctx
      // buy btc-xdn 1 1000
      let [, key, quantity, price] = message.text.split(' ')
      if (!key) return reply('Not found market-coin')
      if (!quantity) return reply('Not found quantity')
      if (!price) return reply('Not found price')
      key = key.toUpperCase()
      quantity = +quantity
      price = +price
      const [market,] = key.split('-')
      const subTotal = quantity * price
      const commission = 0.25 * subTotal / 100
      const total = subTotal + commission
      const msgs = []
      msgs.push(`FORM BUYING DETAILS`)
      msgs.push(`----------------------------------------------`)
      msgs.push(`Market:               ${key}`)
      msgs.push(`Quantity:            ${BittrexApi.formatNumber(quantity)}`)
      msgs.push(`Price:                    ${BittrexApi.formatNumber(price)} ${market}`)
      msgs.push(`Subtotal:             ${BittrexApi.formatNumber(subTotal)} ${market}`)
      msgs.push(`Commission:     ${BittrexApi.formatNumber(commission)} ${market}`)
      msgs.push(`Total:                     ${BittrexApi.formatNumber(total)} ${market}`)
      const balances = await BittrexUser.getMyBalances(from.username)
      const w = balances.find(e => e.Currency === market)
      let isOk = true
      if (w) {
        msgs.push(`----------------------------------------------`)
        msgs.push(`Your wallet 💰`)
        msgs.push(` - Before: ${BittrexApi.formatNumber(w.Available)} ${market}`)
        msgs.push(` - After:   ${BittrexApi.formatNumber(w.Available - total)} ${market}`)
        if (w.Available < total) {
          msgs.push(`----------------------------------------------`)
          msgs.push('😱 Insufficient funds')
          isOk = false
        }
        msgs.push(`----------------------------------------------`)
      }
      return reply(msgs.join('\n'), !isOk ? undefined : Extra.HTML().markup(m => m.inlineKeyboard([
        m.callbackButton('Confirm', `buy:yes\n${key} ${quantity} ${price} `),
        m.callbackButton('Cancel', `buy:no`),
      ]))
      )
    })
  }

  static async registerAddAlert() {
    TelegramCommand.Bot.command('nw', async ({ reply, replyWithMarkdown, from, message }) => {
      const [kf, des] = message.text.split('\n')
      const [, key, formula] = kf.toUpperCase().split(' ')
      if (!key || !formula) return reply('Not found market-coin or formular')
      await BittrexAlert.addAlert(from.username, new BittrexAlert(key, formula, des))
      const tmp = TelegramCommand.getAlertMsgs(from.username, key)
      if (tmp.length === 0) return reply('No alert')
      return replyWithMarkdown(tmp.join('\n'))
    })
  }

  private static getAlertMsgs(username: string, _key: string) {
    const tmp = []
    const alert = BittrexAlert.getAlerts(username)
    if (!alert || Object.keys(alert).length === 0) return tmp
    for (let key in alert) {
      if (_key && key !== _key) continue
      if (tmp.length === 0) {
        tmp.push(`Alerts\n--------------------------------`)
      }
      const f = BittrexApi.newestTrading.find(e => e.key === key)
      tmp.push(`* ${key}* ~${f ? BittrexApi.formatNumber(f.last) : ''} `)
      tmp.push(alert[key].map((e, i) => `${i} | * $${e.formula}* | _${e.des || ''} _`).join('\n'))
      tmp.push('')
    }
    return tmp
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
    TelegramCommand.Bot.command('ls', async ({ reply, replyWithMarkdown, from, message }) => {
      const alert = BittrexAlert.getAlerts(from.username)
      if (!alert || Object.keys(alert).length === 0) return reply('No alert')
      let [, _key] = message.text.split(' ')
      if (_key) _key = _key.toUpperCase()
      const tmp = TelegramCommand.getAlertMsgs(from.username, _key)
      if (tmp.length === 0) return reply('No alert')
      return replyWithMarkdown(tmp.join('\n'))
    })
  }

  static async registerRmAlert() {
    TelegramCommand.Bot.command('rm', async ({ reply, replyWithMarkdown, from, message }) => {
      let [, key, i] = message.text.split(' ')
      if (!key) return reply('Not found Market-Coin')
      if (i === undefined) return reply('Not found index to remove')
      key = key.toUpperCase()
      await BittrexAlert.rmAlert(from.username, key, +i)
      const tmp = TelegramCommand.getAlertMsgs(from.username, key)
      if (tmp.length === 0) return reply('No alert')
      return replyWithMarkdown(tmp.join('\n'))
    })
  }

  static async registerClearAlert() {
    TelegramCommand.Bot.command('cls', async ({ reply, replyWithMarkdown, from, message }) => {
      let [, key] = message.text.split(' ')
      if (key) key = key.toUpperCase()
      await BittrexAlert.rmAlert(from.username, key, -1)
      const tmp = TelegramCommand.getAlertMsgs(from.username, key)
      if (tmp.length === 0) return reply('No alert')
      return replyWithMarkdown(tmp.join('\n'))
    })
  }

  static async registerGetCoinInfo() {
    TelegramCommand.Bot.hears(/^#.+$/i, ({ reply, replyWithMarkdown, message }) => {
      let coin = message.text.split('#')[1];
      if (!coin) return reply('Not found coin')
      coin = coin.toUpperCase()
      const txt = []
      const newestTrading = BittrexApi.newestTrading
      for (const c of newestTrading) {
        if (c.name === coin) {
          txt.push(`* ${c.key}* ~${BittrexApi.formatNumber(c.last)} `)
        }
      }
      if (txt.length > 0) return replyWithMarkdown(txt.join('\n'))
      return reply('Could not found this coin')
    })
  }

  static async registerGetRate() {
    TelegramCommand.Bot.command('rate', async ({ replyWithMarkdown }) => {
      return replyWithMarkdown(`* 1 BTC * = ${BittrexApi.formatNumber(BittrexApi.rate['BTC-USDT'])} USDT
        * 1 ETH * = ${ BittrexApi.formatNumber(BittrexApi.rate['ETH-USDT'])} USDT
          * 1 BTC * = ${ BittrexApi.formatNumber(BittrexApi.rate['BTC-ETH'])} ETH`)
    })
  }

  static async registerGetMyWalletStatus() {
    TelegramCommand.Bot.command('wallet', async ({ replyWithMarkdown, from }) => {
      const balances = await BittrexUser.getMyBalances(from.username)
      const msg = balances.filter(e => e.Available || e.Balance).map(e => {
        let msgs = [`* ${e.Currency}* ~${BittrexApi.formatNumber(e.Balance)} `]
        if (e.Available && e.Available !== e.Balance) msgs.push(`  - Available ~${BittrexApi.formatNumber(e.Available)} `)
        return msgs.join('\n')
      }).join('\n')
      return replyWithMarkdown(msg)
    })
  }

  static async registerGetMyWalletID() {
    TelegramCommand.Bot.command('walletid', async ({ replyWithMarkdown, from }) => {
      const balances = await BittrexUser.getMyBalances(from.username)
      const msg = balances.filter(e => e.Available).map(e => `* ${e.Currency}* _${e.CryptoAddress || ''} _`).join('\n')
      return replyWithMarkdown(msg)
    })
  }

}