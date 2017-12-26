import { BotCommand } from '../Telegram'
import BittrexApi from './BittrexApi';

export class TelegramCommand {
  static async bindCmdTelegram() {
    console.log('Bind Bittrex telegram BOT')
    const bot = new BotCommand(AppConfig.app.bittrex.telegramBot) as any
    bot.hears('help', async ({ reply }) => {
      reply(`"rate": Show btc, eth, usdt price at current time
  "coin COIN_NAME": Show coin price at current time
  "walletid": Show the wallet IDs
  "wallet": Show the balances of wallets
  `)
    })
    bot.hears(/^wallet(id)?$/i, async ({ reply, message }) => {
      const balances = await BittrexApi.getMyBalances()
      let rs
      if (message.text.indexOf('id') !== -1) {
        rs = balances.filter(e => e.Available).map(e => `#${e.Currency}
  ${e.CryptoAddress}`).join('\n---------------------------------------------\n')
      } else {
        rs = balances.filter(e => e.Available).map(e => `#${e.Currency}
  - Available: ${BittrexApi.formatNumber(e.Available)}
  - Total: ${BittrexApi.formatNumber(e.Balance)}`).join('\n---------------------------------------------\n')
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