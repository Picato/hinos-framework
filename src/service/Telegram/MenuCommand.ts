import * as Telegraf from 'telegraf'
import { User } from '../User';
import * as Markup from 'telegraf/markup'
import * as Extra from 'telegraf/extra'
import Utils from '../../common/Utils';
import RawHandler from '../Crawler/RawHandler';
import RemitanoHandler from '../Crawler/RemitanoHandler';
import HttpError from '../../common/HttpError';

export default class MenuCommand {
  static readonly Bot = new Telegraf(AppConfig.app.telegram.MenuBot)

  static async init() {
    await MenuCommand.initCommand()
  }

  static getMenuCommand() {
    return ['/rate', '/wallet', '/walletid']
  }

  static initCommand() {
    MenuCommand.Bot.hears(/^\/login ([^\s]+) ([^\s]+)/, async ({ deleteMessage, match, from, reply }) => {
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
    MenuCommand.Bot.hears(/^#(.+)$/i, async (ctx) => {
      const { reply, replyWithMarkdown, match } = ctx
      try {
        let [, coin] = match
        coin = Utils.getQuickCoin(coin)
        const tradings = await RawHandler.getTradings()
        const txt = [
          `*🚀 ${coin} DETAILS 🚀*`, '-----------------------------------------',
          ...tradings.filter(c => c.key.includes(coin)).map(c => `[${c.key}](https://bittrex.com/Market/Index?MarketName=${c.key}) = ${Utils.formatNumber(c.last)}`)
        ]
        if (txt.length > 1) return await replyWithMarkdown(txt.join('\n'))
        await reply('Could not found this coin')
      } catch (e) {
        await reply(e.message || e)
      }
    })
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
            if (w.CryptoAddress && w.CryptoAddress.length > 0)
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
          MenuCommand.getMenuCommand()
        ])
        .oneTime()
        .resize()
        .extra()
      )
    )
    MenuCommand.Bot.startPolling()
  }

  static getRateStr(title, rate, vnd) {
    const msgs = title ? [`${title} ⏱ *${new Date().toTimeString().split(' ')[0]}* ⏱`] : []
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