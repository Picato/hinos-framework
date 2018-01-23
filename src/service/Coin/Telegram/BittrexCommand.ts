import { BotCommand } from './Telegram'
import BittrexApi from './BittrexApi'
import BittrexUser from './BittrexUser'
import * as Extra from 'telegraf/extra'
import RawTrading from '../Crawler/RawHandler'
import RemitanoCrawler from '../Remitano/Crawler';
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
    // BittrexCommand.registerGetAlerts()
    // BittrexCommand.registerRmAlert()
    // BittrexCommand.registerClearAlert()
    BittrexCommand.registerLSBuy()
    BittrexCommand.registerLSSell()
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
      const [, apikey, secretKey] = message.text.split(' ')
      if (!apikey) return await reply('Apikey is required')
      if (!secretKey) return await reply('SecretKey is required')
      await BittrexUser.add(from.id.toString(), apikey, secretKey, chat.id)
      await deleteMessage()
      await reply(`[${from.id}] Hi ${from.first_name} ${from.last_name}.\nYour account is registed via bittrex apikey`)
    })
  }

  private static registerLSSell() {
    BittrexCommand.HelperBot.action(/lssell:(pagi) .+/, async (ctx) => {
      const { editMessageText, reply, match } = ctx
      try {
        let [, key, page, recordsPerPage] = match[0].split(' ')
        page = +page
        recordsPerPage = +recordsPerPage
        let msgs = await BittrexCommand.getOrderBook(key, page, recordsPerPage, 'sell')
        return await editMessageText(msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([1, 2, 3, 4, 5].map(e => {
          return m.callbackButton(`${e}${e === page ? '⚪️' : ''}`, `lssell:pagi ${key} ${e} ${recordsPerPage}`)
        }))))
      } catch (e) {
        await reply(e.message || e)
      }
    })
    BittrexCommand.HelperBot.command('lssell', async (ctx) => {
      const { reply, message, replyWithMarkdown } = ctx
      try {
        let [, key, page = 1, recordsPerPage = 10] = message.text.split(' ')
        page = +page
        recordsPerPage = +recordsPerPage
        if (!key) return await reply('Not found market-coin')
        let msgs = await BittrexCommand.getOrderBook(key, page, recordsPerPage, 'sell')
        return await replyWithMarkdown(msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([1, 2, 3, 4, 5].map(e => {
          return m.callbackButton(`${e}${e === page ? '⚪️' : ''}`, `lssell:pagi ${key} ${e} ${recordsPerPage}`)
        }))))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  private static registerLSBuy() {
    BittrexCommand.HelperBot.action(/lsbuy:(pagi) .+/, async (ctx) => {
      const { editMessageText, reply, match } = ctx
      try {
        let [, key, page, recordsPerPage] = match[0].split(' ')
        page = +page
        recordsPerPage = +recordsPerPage
        let msgs = await BittrexCommand.getOrderBook(key, page, recordsPerPage, 'buy')
        return await editMessageText(msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([1, 2, 3, 4, 5].map(e => {
          return m.callbackButton(`${e}${e === page ? '⚪️' : ''}`, `lsbuy:pagi ${key} ${e} ${recordsPerPage}`)
        }))))
      } catch (e) {
        await reply(e.message || e)
      }
    })
    BittrexCommand.HelperBot.command('lsbuy', async (ctx) => {
      const { reply, message, replyWithMarkdown } = ctx
      try {
        let [, key, page = 1, recordsPerPage = 10] = message.text.split(' ')
        page = +page
        recordsPerPage = +recordsPerPage
        if (!key) return await reply('Not found market-coin')
        let msgs = await BittrexCommand.getOrderBook(key, page, recordsPerPage, 'buy')
        return await replyWithMarkdown(msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard([1, 2, 3, 4, 5].map(e => {
          return m.callbackButton(`${e}${e === page ? '⚪️' : ''}`, `lsbuy:pagi ${key} ${e} ${recordsPerPage}`)
        }))))
      } catch (e) {
        await reply(e.message || e)
      }
    })
  }

  // private static registerGetAlerts() {
  //   BittrexCommand.Bot.command('ls', async (ctx) => {
  //     const { reply, replyWithMarkdown, from, message } = ctx
  //     try {
  //       const user = BittrexUser.users[from.id.toString()]
  //       if (!user) return reply('User not login yet')
  //       let [, _key] = message.text.split(' ')
  //       if (_key) _key = _key.toUpperCase()
  //       const tmp = await BittrexCommand.getAlertMsgs(user.alerts, _key)
  //       if (tmp.length === 0) return await reply('No alert')
  //       await replyWithMarkdown(tmp.join('\n'))
  //     } catch (e) {
  //       await reply(e.message || e)
  //     }
  //   })
  // }

  // private static registerRmAlert() {
  //   BittrexCommand.Bot.command('rm', async (ctx) => {
  //     const { reply, replyWithMarkdown, from, message } = ctx
  //     try {
  //       let [, key, i] = message.text.split(' ')
  //       if (!key) return await reply('Not found Market-Coin')
  //       if (i === undefined) return await reply('Not found index to remove')
  //       key = key.toUpperCase()
  //       const user = BittrexUser.users[from.id.toString()]
  //       if (!user) return reply('User not login yet')
  //       await user.rmAlert(key, +i)
  //       const tmp = await BittrexCommand.getAlertMsgs(user.alerts, key)
  //       await replyWithMarkdown(tmp.join('\n'))
  //     } catch (e) {
  //       await reply(e.message || e)
  //     }
  //   })
  // }

  // private static registerClearAlert() {
  //   BittrexCommand.Bot.command('cls', async (ctx) => {
  //     const { reply, replyWithMarkdown, from, message } = ctx
  //     try {
  //       const user = BittrexUser.users[from.id.toString()]
  //       if (!user) return reply('User not login yet')
  //       let [, key] = message.text.split(' ')
  //       if (key) key = key.toUpperCase()
  //       await user.rmAlert(key, -1)
  //       const tmp = await BittrexCommand.getAlertMsgs(user.alerts, undefined)
  //       if (tmp.length === 0) return await reply('No alert')
  //       await replyWithMarkdown(tmp.join('\n'))
  //     } catch (e) {
  //       await reply(e.message || e)
  //     }
  //   })
  // }

  private static registerGetCoinInfo() {
    BittrexCommand.HelperBot.hears(/^#.+$/i, async (ctx) => {
      const { reply, replyWithMarkdown, message } = ctx
      try {
        let coin = message.text.split('#')[1];
        if (!coin) return await reply('Not found coin')
        coin = coin.toUpperCase()
        const txt = [`*🚀 ${coin} DETAILS 🚀*`, '-----------------------------------------']
        const newestTrading = await RawTrading.getTradings()
        for (const c of newestTrading) {
          if (c.name === coin) {
            txt.push(`[${c.key}](https://bittrex.com/Market/Index?MarketName=${c.key}) = ${BittrexApi.formatNumber(c.last)} `)
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
        const msgs = await BittrexCommand.getRateStr()
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
        const user = BittrexUser.get(from.id.toString())
        const balances = await user.getMyBalances()
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
        const user = BittrexUser.get(from.id.toString())
        const balances = await user.getMyBalances()
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

  static async getRateStr() {
    const rate = await RawTrading.getRate()
    const vnd = await RemitanoCrawler.getRate()
    const msgs = [
      `⏱ Rate at *${new Date().toTimeString().split(' ')[0]}* ⏱`,
      `-----------------------------------------`,
      `*1 BTC*    = ${BittrexApi.formatNumber(rate['BTC-USDT'])} *USDT*`,
      `*1 ETH*    = ${BittrexApi.formatNumber(rate['ETH-USDT'])} *USDT*`,
      `*1 BTC*    = ${BittrexApi.formatNumber(rate['BTC-ETH'])} *ETH*`,
      `-----------------------------------------`,
      `*1 USDT* = ${BittrexApi.formatNumber(vnd['usdt_ask'], false, 0)} / ${BittrexApi.formatNumber(vnd['usdt_bid'], false, 0)} *VND* _(Buy/Sell)_`,
      `*1 BTC*    = ${BittrexApi.formatNumber(vnd['btc_ask'], false, 0)} / ${BittrexApi.formatNumber(vnd['btc_bid'], false, 0)} *VND* _(Buy/Sell)_`,
    ]
    return msgs
  }

  private static async getOrderBook(key: string, page = 1, recordsPerPage = 10, type: 'sell' | 'buy') {
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
        return ` *${i > 9 ? i : ('0' + i)}.* ${maxI === i0 ? '*' : ''}🎲${BittrexApi.formatNumber(e.Quantity)}${maxI === i0 ? '*' : ''} 💰${BittrexApi.formatNumber(e.Rate)}`
      })]
    }
    const orders = await BittrexUser.getOrderBook(key, type)
    let msgs = [
      `[${key}](https://bittrex.com/Market/Index?MarketName=${key}) LASTEST *${type === 'buy' ? 'BUYING' : 'SELLING'}*`,
      '----------------------------------------------',
      ...formatMessages(orders)
    ]
    return msgs
  }

  // private static async getAlertMsgs(alert, _key: string) {
  //   const tmp = [
  //     '*ALERTS*',
  //     '-----------------------------------------'
  //   ]
  //   for (let key in alert) {
  //     if (_key && key !== _key) continue
  //     const newestTrading = await RawTrading.getTradings()
  //     const f = newestTrading.find(e => e.key === key)
  //     tmp.push(`[${key}](https://bittrex.com/Market/Index?MarketName=${key}) = ${f ? BittrexApi.formatNumber(f.last) : ''}`)
  //     tmp.push(alert[key].map((e, i) => ` ${i} | * $${e.formula}* | _${e.des || ''} _`).join('\n'))
  //     tmp.push('')
  //   }
  //   return tmp
  // }

}