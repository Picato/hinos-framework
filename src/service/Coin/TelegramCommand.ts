import { BotCommand, BotFather } from '../Telegram'
import BittrexApi from './BittrexApi'
import BittrexUser from './BittrexUser'
import BittrexAlert from './BittrexAlert'
// const Extra = require('telegraf/extra')
const Markup = require('telegraf/markup')

export class TelegramCommand {

  static BotFather = new BotFather(AppConfig.app.bittrex.telegramBot, '504722063')
  private static Bot = new BotCommand(AppConfig.app.bittrex.telegramBot)

  static async init() {
    await Promise.all([
      BittrexUser.reloadFromCached(),
      BittrexAlert.reloadFromCached()
    ])
    TelegramCommand.Bot.command('apikey', async ({ reply, from, message }) => {
      const apikey = message.text.split(' ')[1]
      if (!apikey) return reply('Apikey is required')
      await BittrexUser.add(from.username, apikey)
      reply('Registed bittrex apikey')
    })
    // Refer https://github.com/telegraf/telegraf/blob/develop/docs/examples/keyboard-bot.js
    TelegramCommand.Bot.command('help', ({ reply }) => {
      return reply('Action support', Markup
        .inlineKeyboard([
          Markup.callbackButton('Rate', 'rate'),
          Markup.callbackButton('Show alerts', 'rate')
        ])
        .oneTime()
        .resize()
        .extra()
      )
    })
    TelegramCommand.Bot.action('rate', (_ctx) => {
      console.log('ok')
    })
    await TelegramCommand.registerGetMyWalletStatus()
    await TelegramCommand.registerGetMyWalletID()
    await TelegramCommand.registerGetRate()
    await TelegramCommand.registerGetCoinInfo()
    await TelegramCommand.registerAddAlert()
    await TelegramCommand.registerGetAlerts()
    await TelegramCommand.registerRmAlert()

    TelegramCommand.Bot.startPolling()
  }

  static async registerAddAlert() {
    TelegramCommand.Bot.command('add', async ({ reply, replyWithMarkdown, from, message }) => {
      const [kf, des] = message.text.split('\n')
      const [, key, formula] = kf.toUpperCase().split(' ')
      if (!key || !formula) return reply('Not found market-coin or formular')
      await BittrexAlert.addAlert(from.username, new BittrexAlert(key, formula, des))
      const tmp = await TelegramCommand.getAlertMsgs(from.username, key)
      if (tmp.length === 0) return reply('No alert')
      replyWithMarkdown(tmp.join('\n'))
    })
  }

  private static async getAlertMsgs(username: string, _key: string) {
    const tmp = []
    const alert = BittrexAlert.getAlerts(username)
    if (!alert || Object.keys(alert).length === 0) return tmp
    for (let key in alert) {
      if (_key && key !== _key) continue
      tmp.push(`*${key}*`)
      tmp.push(alert[key].map((e, i) => `*${i}* | ${e.formula} | _${e.des || ''}_`).join('\n'))
    }
    return tmp
  }

  static async registerGetAlerts() {
    const Extra = require('telegraf/extra')
    const Markup = require('telegraf/markup')
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
    const markup = Extra.markup(
      Markup.inlineKeyboard([
        Markup.gameButton('🎮 Play now!'),
        Markup.urlButton('Telegraf help', 'http://telegraf.js.org')
      ])
    )
    TelegramCommand.Bot.command('ls', async ({ reply, replyWithMarkdown, from, message }) => {
      const alert = BittrexAlert.getAlerts(from.username)
      if (!alert || Object.keys(alert).length === 0) return reply('No alert')
      let [, _key] = message.text.split(' ')
      if (_key) _key = _key.toUpperCase()
      const tmp = await TelegramCommand.getAlertMsgs(from.username, _key)
      if (tmp.length === 0) return reply('No alert')
      replyWithMarkdown(tmp.join('\n'), markup)
    })
  }

  static async registerRmAlert() {
    TelegramCommand.Bot.command('rm', async ({ reply, replyWithMarkdown, from, message }) => {
      let [, key, i] = message.text.split(' ')
      if (!key) return reply('Not found Market-Coin')
      if (i === undefined) return reply('Not found index to remove')
      key = key.toUpperCase()
      BittrexAlert.rmAlert(from.username, key, +i)
      const tmp = await TelegramCommand.getAlertMsgs(from.username, key)
      if (tmp.length === 0) return reply('No alert')
      replyWithMarkdown(tmp.join('\n'))
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
          txt.push(`*${c.key}* ${BittrexApi.formatNumber(c.last[c.market.toLowerCase()])}`)
          // if (c.name !== 'USDT') txt.push(`- ${BittrexApi.formatNumber(c.last.usdt)} USDT`)
          // if (c.name !== 'BTC') txt.push(`- ${BittrexApi.formatNumber(c.last.btc)} BTC`)
          // if (c.name !== 'ETH') txt.push(`- ${BittrexApi.formatNumber(c.last.eth)} ETH`)
          // txt.push(`---------------------------------------------`)
        }
      }
      if (txt.length > 0) return replyWithMarkdown(txt.join('\n'))
      return reply('Could not found this coin')
    })
  }

  static async registerGetRate() {
    TelegramCommand.Bot.command('rate', async ({ reply }) => {
      reply(`1 BTC = ${BittrexApi.formatNumber(BittrexApi.rate['BTC-USDT'])} USDT
1 ETH = ${BittrexApi.formatNumber(BittrexApi.rate['ETH-USDT'])} USDT
1 BTC = ${BittrexApi.formatNumber(BittrexApi.rate['BTC-ETH'])} ETH`)
    })
  }

  static async registerGetMyWalletStatus() {
    TelegramCommand.Bot.command('wallet', async ({ reply, from }) => {
      const balances = await BittrexUser.getMyBalances(from.username)
      const msg = balances.filter(e => e.Available || e.Balance).map(e => {
        let msgs = [`#${e.Currency}: ${BittrexApi.formatNumber(e.Balance)}`]
        if (e.Available && e.Available !== e.Balance) msgs.push(`  - Available: ${BittrexApi.formatNumber(e.Available)}`)
        return msgs.join('\n')
      }).join('\n')
      reply(msg)
    })
  }

  static async registerGetMyWalletID() {
    TelegramCommand.Bot.command('walletid', async ({ reply, from }) => {
      const balances = await BittrexUser.getMyBalances(from.username)
      const msg = balances.filter(e => e.Available).map(e => `#${e.Currency} ${e.CryptoAddress || ''}`).join('\n')
      reply(msg)
    })
  }

}