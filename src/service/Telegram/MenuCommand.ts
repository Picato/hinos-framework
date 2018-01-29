import * as Telegraf from 'telegraf'
import { User } from '../User';
import * as Markup from 'telegraf/markup'
import * as Extra from 'telegraf/extra'
import Utils from '../../common/Utils';
import OrderCommand from './OrderCommand';
import AlertCommand from './AlertCommand';
import RawHandler from '../Crawler/RawHandler';
import RemitanoHandler from '../Crawler/RemitanoHandler';

export default class MenuCommand {
  static readonly Bot = new Telegraf('386949389:AAFnFpMlKTGR5fa5Y1tPnzXUNziGSxLN8Kw')

  static async init() {
    await MenuCommand.initCommand()
  }

  static getMenuCommand() {
    return ['/wallet', '/walletid', '/rate']
  }

  static initCommand() {
    MenuCommand.Bot.hears(/^\/rate/, async (ctx) => {
      const { replyWithMarkdown, reply } = ctx
      try {
        const vnd = await RemitanoHandler.getRate()
        const rate = await RawHandler.getRate()
        const msgs = MenuCommand.getRateStr('RATE', rate, vnd)
        await replyWithMarkdown(msgs.join('\n'))
      } catch (e) {
        await reply(e.message || e)
      }
    })
    MenuCommand.Bot.hears(/^\/wallet(id)?/, async (ctx) => {
      const { replyWithMarkdown, from, reply, match } = ctx
      try {
        const user = User.get(from.id)
        const [, id] = match
        const balances = await user.getMyBalances()
        if (!id) {
          const msg = [
            '*WALLETS*',
            '-----------------------------------------',
            ...balances.filter(e => e.Available || e.Balance).map(e => {
              let msgs = [`#${e.Currency} = ${Utils.formatNumber(e.Balance)} `]
              if (e.Available && e.Available !== e.Balance) msgs.push(`  - Available ~${Utils.formatNumber(e.Available)} `)
              return msgs.join('\n')
            })
          ]
          await replyWithMarkdown(msg.join('\n'), Extra.markdown())
        } else {
          for (const w of balances.filter(e => e.Available)) {
            await replyWithMarkdown(`[#${w.Currency}](https://api.qrserver.com/v1/create-qr-code/?data=${w.CryptoAddress}&size=100x100&margin=0) _${w.CryptoAddress || ''}_`, Extra.markdown())
          }
        }
      } catch (e) {
        await reply(e.message || e)
      }
    })
    MenuCommand.Bot.start(({ reply }) =>
      reply('Initial menu', Markup
        .keyboard([
          MenuCommand.getMenuCommand(),
          OrderCommand.getMenuCommand().concat(AlertCommand.getMenuCommand())
        ])
        .oneTime()
        .resize()
        .extra()
      )
    )
    MenuCommand.Bot.startPolling()
  }

  static getRateStr(title, rate, vnd) {
    const msgs = [`${title} ⏱ *${new Date().toTimeString().split(' ')[0]}* ⏱`]
    if (rate) {
      msgs.push(`-----------------------------------------`)
      msgs.push(`*1 BTC*    = ${Utils.formatNumber(rate['BTC-USDT'], false, 0)} *USDT*`)
      msgs.push(`*1 ETH*    = ${Utils.formatNumber(rate['ETH-USDT'], false, 0)} *USDT*`)
      msgs.push(`*1 BTC*    = ${Utils.formatNumber(rate['BTC-ETH'], false, 0)} *ETH*`)
    }
    if (vnd) {
      msgs.push(`-----------------------------------------`)
      msgs.push(`*1 USDT* = ${Utils.formatNumber(vnd['usdt_ask'], false, 0)} / ${Utils.formatNumber(vnd['usdt_bid'], false, 0)} *VND* _(Buy/Sell)_`)
      msgs.push(`*1 BTC*    = ${Utils.formatNumber(vnd['btc_ask'], false, 0)} / ${Utils.formatNumber(vnd['btc_bid'], false, 0)} *VND* _(Buy/Sell)_`)
    }
    return msgs
  }

}