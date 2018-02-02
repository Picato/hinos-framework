import * as Telegraf from 'telegraf'
import { User } from '../User';
import RawHandler, { TradingTemp } from '../Crawler/RawHandler';
import * as Markup from 'telegraf/markup'
import * as Extra from 'telegraf/extra'
import Utils from '../../common/Utils';
import { Alert } from '../Alert';
import HttpError from '../../common/HttpError';
import Logger from '../../common/Logger';
import { TRACE } from '../../common/Tracer';
import RemitanoHandler from '../Crawler/RemitanoHandler';
import MenuCommand from './MenuCommand';

export default class AlertCommand {
  static readonly Bot = new Telegraf(AppConfig.app.telegram.AlertBot)

  static async init() {
    await AlertCommand.initCommand()
  }

  static getMenuCommand() {
    return ['/alert', '/arate']
  }

  @TRACE()
  static async runBackground() {
    const tradings = await RawHandler.getTradings()
    for (const user of User.users) {
      for (const key in user.alerts) {
        const als = user.alerts[key]
        const btn = []
        let msgs = []
        let t = { last: 0 } as TradingTemp
        if (['BUY-BTC', 'BUY-USDT', 'SELL-BTC', 'SELL-USDT'].includes(key)) {
          const vnd = await RemitanoHandler.getRate()
          if (key === 'BUY-USDT') t.last = vnd['usdt_ask']
          else if (key === 'SELL-USDT') t.last = vnd['usdt_bid']
          else if (key === 'BUY-BTC') t.last = vnd['btc_ask']
          else if (key === 'SELL-BTC') t.last = vnd['btc_bid']
          msgs.push(`Alert at *${new Date().toTimeString().split(' ')[0]}*`)
          msgs.push(`----------------------------------------------`)
          msgs.push(`[${key}](https://bittrex.com)    *${Utils.formatNumber(t.last)}* VND 🚀`)
          msgs.push(`----------------------------------------------`)
        } else if (key === 'RATE') {
          const rate = await RawHandler.getRate()
          const vnd = await RemitanoHandler.getRate()
          msgs = MenuCommand.getRateStr(`Rate at *${new Date().toTimeString().split(' ')[0]}*`, rate, vnd)
        } else {
          t = tradings.find(e => e.key === key)
          const [market] = key.split('-')
          msgs.push(`Alert at *${new Date().toTimeString().split(' ')[0]}*`)
          msgs.push(`----------------------------------------------`)
          msgs.push(`[${key}](https://bittrex.com/Market/Index?MarketName=${key})    *${Utils.formatNumber(t.last)}* ${market} 🚀`)
          msgs.push(`----------------------------------------------`)
          msgs.push(`*  5%* | ${Utils.formatNumber(t.last + t.last * 5 / 100)} | ${Utils.formatNumber(t.last - t.last * 5 / 100)}`)
          msgs.push(`*10%* | ${Utils.formatNumber(t.last + t.last * 10 / 100)} | ${Utils.formatNumber(t.last - t.last * 10 / 100)}`)
          msgs.push(`*15%* | ${Utils.formatNumber(t.last + t.last * 15 / 100)} | ${Utils.formatNumber(t.last - t.last * 15 / 100)}`)
          msgs.push(`*20%* | ${Utils.formatNumber(t.last + t.last * 20 / 100)} | ${Utils.formatNumber(t.last - t.last * 20 / 100)}`)
          msgs.push(`----------------------------------------------`)
        }
        if (key !== 'RATE') {
          const len = als.alerts.length
          for (let i = len - 1; i >= 0; i--) {
            const al = als.alerts[i]
            if (al.isAlert(t)) {
              await AlertCommand.Bot.telegram.sendMessage(als.chatId, al.getMessageDone(t), Extra.markdown())
              const rs = await user.removeAlert(al)
              if (rs === 0) try { await AlertCommand.Bot.telegram.deleteMessage(als.chatId, als.messageId) } catch (_e) { }
            } else {
              msgs.push(al.getMessage(t.last))
              btn.push({ text: `${len - i}`, cmd: `alert:remove ${key} ${al.id}` })
            }
          }
        }
        btn.push({ text: '🚫 REMOVE ALERT', cmd: `alert:remove ${key}` })
        try {
          await AlertCommand.Bot.telegram.editMessageText(als.chatId, als.messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
            btn.map(e => m.callbackButton(e.text, e.cmd))
          )))
        } catch (e) {
          Logger.error(e)
        }
      }
    }
    setTimeout(async () => {
      await AlertCommand.runBackground()
    }, AppConfig.app.bittrex.scanTimeout)
  }

  static initCommand() {
    AlertCommand.Bot.start(async ({ chat, from, message, reply, deleteMessage }) => {
      try {
        const user = User.get(from.id)
        const [, chatid] = message.text.split(' ')
        user.globalAlertId = chatid || chat.id
        await deleteMessage()
        await AlertCommand.Bot.telegram.sendMessage(user.globalAlertId, 'Ping', Extra.markdown())
        await user.save()
        await reply(`Registed global alert`, Markup
          .keyboard([
            AlertCommand.getMenuCommand()
          ])
          .oneTime()
          .resize()
          .extra()
        )
      } catch (e) {
        await reply(e.message || e)
      }
    })
    AlertCommand.Bot.hears(/^\/arate/, async ({ from, reply, chat }) => {
      try {
        const key = Utils.getQuickCoin('rate')
        const user = User.get(from.id)
        const rs = await reply(`Added alert for ${key}`)
        const old = await user.addAlert({
          key
        } as Alert, chat.id, rs.message_id)
        if (old) try { await AlertCommand.Bot.telegram.deleteMessage(old.chatId, old.messageId) } catch (_e) { }
      } catch (e) {
        await reply(e.message)
      }
    })
    AlertCommand.Bot.hears(/^\/nw (<|<=|>|>=)\s*([.\d]+)(\s(.+))?/i, async ({ from, reply, chat, match, message, deleteMessage }) => {
      if (message.reply_to_message) {
        let [, operator, num, , des] = match
        const user = User.get(from.id)
        let key
        for (let k in user.alerts) {
          const e = user.alerts[k]
          if (e.chatId === chat.id && e.messageId === message.reply_to_message.message_id) {
            key = k
            break
          }
        }
        if (!key) return await reply('Could not found this reply')
        await user.addAlert({
          key,
          operator,
          des,
          num: Utils.getQuickPrice(num),
        } as Alert, chat.id, message.reply_to_message.message_id)
        await user.save()
        deleteMessage()
      }
    })
    AlertCommand.Bot.hears(/^\/alert/, async ({ match, from, reply, chat }) => {
      try {
        const user = User.get(from.id)
        const alerts = user.alerts
        if (Object.keys(alerts).length === 0) throw HttpError.NOT_FOUND('Have no any alerting')
        for (let key in user.alerts) {
          const als = user.alerts[key]
          try { await AlertCommand.Bot.telegram.deleteMessage(als.chatId, als.messageId) } catch (_e) { }
          const rs = await reply(`Reloading ${key}`)
          als.messageId = rs.message_id
          als.chatId = chat.id
        }
        await user.save()
      } catch (e) {
        await reply(e.message)
      }
    })
    AlertCommand.Bot.hears(/^\/nw ([\w-]+) (<|<=|>|>=)\s*([.\d]+)(\s(.+))?/, async ({ match, from, reply, chat }) => {
      try {
        let [, key, operator, num, , des] = match
        key = Utils.getQuickCoin(key)
        const user = User.get(from.id)
        const rs = await reply(`Added alert for ${key}`)
        const old = await user.addAlert({
          key,
          operator,
          des,
          num: Utils.getQuickPrice(num),
        } as Alert, chat.id, rs.message_id)
        if (old) try { await AlertCommand.Bot.telegram.deleteMessage(old.chatId, old.messageId) } catch (_e) { }
      } catch (e) {
        await reply(e.message)
      }
    })
    AlertCommand.Bot.action(/alert:remove ([\w-]+)(\s(.+))?/, async ({ match, from, reply }) => {
      try {
        let [, key, , id] = match
        key = Utils.getQuickCoin(key)
        const user = User.get(from.id)
        const als = user.alerts[key]
        const rs = await user.removeAlert({
          key,
          id
        } as Alert)
        if (rs === 0) try { await AlertCommand.Bot.telegram.deleteMessage(als.chatId, als.messageId) } catch (_e) { }
      } catch (e) {
        await reply(e.message)
      }
    })
    AlertCommand.Bot.startPolling()
  }

}