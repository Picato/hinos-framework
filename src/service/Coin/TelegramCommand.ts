import { BotCommand, BotFather } from '../Telegram'
import BittrexApi from './BittrexApi'
import { Notification } from './Notification'

export class TelegramCommand {

  static Bot = new BotFather(AppConfig.app.bittrex.telegramBot, '504722063')

  static async bindCmdTelegram() {
    console.log('Bind Bittrex telegram BOT')
    const bot = new BotCommand(AppConfig.app.bittrex.telegramBot) as any
    bot.command('help', async (ctx) => {
      ctx.reply(`"rate": Show btc, eth, usdt price at current time
  "coin COIN_NAME": Show coin price at current time
  "walletid": Show the wallet IDs
  "wallet": Show the balances of wallets
  `)
    })
    const getListNotify = (key) => {
      return `#${key}\n` + Notification.tracing[key].map((e, i) => `  - ${i}: ${e}`).join('\n')
    }
    const checkKey = (key) => {
      const newestTrading = BittrexApi.newestTrading
      if (!newestTrading) return false
      return newestTrading.findIndex(e => e.key === key) !== -1
    }
    bot.hears(/^alert(\s.+)?/i, async ({ reply, message }) => {
      // alert usdt-omg >1000
      let [, action, key, calstr] = message.text.split(' ')
      if (key) key = key.toUpperCase()
      if (action === 'ls') {
        if (key) {
          if (!checkKey(key)) return reply(`Market-Coin ${key} not found`)
          return reply(getListNotify(key))
        }
        return reply(Object.keys(Notification.tracing).map(getListNotify).join('\n'))
      } else if (action === 'rm') {
        if (!calstr) return reply(`Not add index to remove yet`)
        if (!checkKey(key)) return reply(`Market-Coin ${key} not found`)
        await Notification.remove(key, +calstr)
        return reply(getListNotify(key))
      } else {
        calstr = key
        key = action
        if (key) key = key.toUpperCase()
        if (!calstr) return reply(`Not add fomular yet`)
        if (!checkKey(key)) return reply(`Market-Coin ${key} not found`)
        await Notification.save(key, `${calstr}`)
        return reply(getListNotify(key))
      }
    })
    bot.hears(/^wallet(id)?$/i, async ({ reply, message }) => {
      const balances = await BittrexApi.getMyBalances()
      let rs
      if (message.text.indexOf('id') !== -1) {
        rs = balances.filter(e => e.Available).map(e => `#${e.Currency}
  ${e.CryptoAddress}`).join('\n---------------------------------------------\n')
      } else {
        rs = balances.filter(e => e.Available || e.Balance).map(e => {
          let msgs = [`#${e.Currency}: ${BittrexApi.formatNumber(e.Balance)}`]
          if (e.Available && e.Available !== e.Balance) msgs.push(`  - Available: ${BittrexApi.formatNumber(e.Available)}`)
          return msgs.join('\n')
        }).join('\n')
      }
      reply(rs)
    })
    bot.hears('rate', ({ reply }) => reply(`1 BTC = ${BittrexApi.formatNumber(BittrexApi.rate['BTC-USDT'])} USDT
  1 ETH = ${BittrexApi.formatNumber(BittrexApi.rate['ETH-USDT'])} USDT
  1 BTC = ${BittrexApi.formatNumber(BittrexApi.rate['BTC-ETH'])} ETH`
    ))
    bot.hears(/^coin .+/i, ({ reply, message }) => {
      const coin = message.text.split(' ').filter((_e, i) => i > 0).join('').toUpperCase()
      const txt = []
      for (const c of BittrexApi.newestTrading) {
        if (c.name === coin) {
          if (txt.length === 0) txt.push(`#${c.name}`)
          txt.push(`${c.market} market`)
          if (c.name !== 'USDT') txt.push(`- ${BittrexApi.formatNumber(c.last.usdt)} USDT`)
          if (c.name !== 'BTC') txt.push(`- ${BittrexApi.formatNumber(c.last.btc)} BTC`)
          if (c.name !== 'ETH') txt.push(`- ${BittrexApi.formatNumber(c.last.eth)} ETH`)
          txt.push(`---------------------------------------------`)
        }
      }
      if (txt.length > 0) return reply(txt.join('\n'))
      return reply('Could not found this coin')
    })
    bot.startPolling()
  }
}