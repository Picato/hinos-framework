import { BotCommand } from './Telegram'
import BittrexApi from './BittrexApi'
import BittrexUser from './BittrexUser'
import HttpError from '../../../common/HttpError';
import { Cached } from './Cached';
// import * as Markup from 'telegraf/markup'

export default class BittrexCommand {

  // static Bot = new BotCommand(AppConfig.app.telegram.BittrexCommand)  
  static HelperBot = new BotCommand(AppConfig.app.telegram.HelperBot)

  static async init() {
    console.log('TELEGRAM', 'BittrexCommand', 'init')
    // Refer https://github.com/telegraf/telegraf/blob/develop/docs/examples/keyboard-bot.js
    BittrexCommand.registerLogin()
    BittrexCommand.registerGetMyWalletStatus()
    BittrexCommand.registerGetMyWalletID()
    BittrexCommand.registerGetRate()
    BittrexCommand.registerGetCoinInfo()
    BittrexCommand.registerStart()
  }

  private static registerStart() {
    BittrexCommand.HelperBot.start(async (ctx) => {
      const { reply, chat } = ctx
      await reply(`[${chat.id}] Welcome to BittrexBotVN!`)
    })
    BittrexCommand.HelperBot.startPolling()
  }

  private static registerLogin() {
    BittrexCommand.HelperBot.command('login', async (ctx) => {
      const { reply, from, message, chat, deleteMessage } = ctx
      try {
        const [, apikey, secretKey] = message.text.split(' ')
        if (!apikey) throw HttpError.BAD_REQUEST('Apikey is required')
        if (!secretKey) throw HttpError.BAD_REQUEST('SecretKey is required')
        await BittrexUser.add(from.id.toString(), apikey, secretKey, chat.id)
        await deleteMessage()
        await reply(`[${from.id}] Hi ${from.first_name} ${from.last_name}.\nYour account is registed via bittrex apikey`)
      } catch (e) {
        await reply(e.message)
      }
    })
  }

  private static registerGetCoinInfo() {
    BittrexCommand.HelperBot.hears(/^#.+$/i, async (ctx) => {
      const { reply, replyWithMarkdown, message } = ctx
      try {
        let coin = message.text.split('#')[1];
        if (!coin) return await reply('Not found coin')
        coin = coin.toUpperCase()
        const txt = [`*🚀 ${coin} DETAILS 🚀*`, '-----------------------------------------']
        for (const c of Cached.tradings) {
          if (c.name === coin) {
            txt.push(`[${c.key}](https://bittrex.com/Market/Index?MarketName=${c.key}) = ${BittrexApi.formatNumber(c.last)}`)
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
    BittrexCommand.HelperBot.command('rate', async (ctx) => {
      const { replyWithMarkdown, reply } = ctx
      try {
        const msgs = BittrexCommand.getRateStr('RATE', Cached.rate, Cached.vnd)
        await replyWithMarkdown(msgs.join('\n'))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerGetMyWalletStatus() {
    BittrexCommand.HelperBot.command('wallet', async (ctx) => {
      const { replyWithMarkdown, from, reply } = ctx
      try {
        const balances = Cached.balances[from.id.toString()]
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
    BittrexCommand.HelperBot.command('walletid', async (ctx) => {
      const { replyWithMarkdown, from, reply } = ctx
      try {
        const balances = Cached.balances[from.id.toString()]
        const msg = [`*WALLETS ID*\n-----------------------------------------`, balances.filter(e => e.Available).map(e => `*${e.Currency}* _${e.CryptoAddress || ''}_`).join('\n')]
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

  static getRateStr(title, rate, vnd) {
    const msgs = [`${title} ⏱ *${new Date().toTimeString().split(' ')[0]}* ⏱`]
    if (rate) {
      msgs.push(`-----------------------------------------`)
      msgs.push(`*1 BTC*    = ${BittrexApi.formatNumber(rate['BTC-USDT'], false, 0)} *USDT*`)
      msgs.push(`*1 ETH*    = ${BittrexApi.formatNumber(rate['ETH-USDT'], false, 0)} *USDT*`)
      msgs.push(`*1 BTC*    = ${BittrexApi.formatNumber(rate['BTC-ETH'], false, 0)} *ETH*`)
    }
    if (vnd) {
      msgs.push(`-----------------------------------------`)
      msgs.push(`*1 USDT* = ${BittrexApi.formatNumber(vnd['usdt_ask'], false, 0)} / ${BittrexApi.formatNumber(vnd['usdt_bid'], false, 0)} *VND* _(Buy/Sell)_`)
      msgs.push(`*1 BTC*    = ${BittrexApi.formatNumber(vnd['btc_ask'], false, 0)} / ${BittrexApi.formatNumber(vnd['btc_bid'], false, 0)} *VND* _(Buy/Sell)_`)
    }
    return msgs
  }

}