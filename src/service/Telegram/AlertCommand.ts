import * as Telegraf from 'telegraf'
import { User } from '../User';
import RawHandler from '../Crawler/RawHandler';
import * as Extra from 'telegraf/extra'
import Utils from '../../common/Utils';
import { Alert } from '../Alert';
import HttpError from '../../common/HttpError';

export default class AlertCommand {
  static readonly Bot = new Telegraf('392845942:AAEmNcXWn5DOT38BLv_REnOkVnuo2ujs4lQ')

  static async init() {
    await AlertCommand.initCommand()
  }

  static getMenuCommand() {
    return ['/nw']
  }

  static async runBackground() {
    const tradings = await RawHandler.getTradings()
    for (const user of User.users) {
      for (const key in user.alerts) {
        const als = user.alerts[key]
        const t = tradings.find(e => e.key === key)
        const [market] = key.split('-')
        const msgs = [`Alert at *${new Date().toTimeString().split(' ')[0]}*`]
        msgs.push(`----------------------------------------------`)
        msgs.push(`[${key}](https://bittrex.com/Market/Index?MarketName=${key})    *${Utils.formatNumber(t.last)}* ${market} 🚀`)
        msgs.push(`----------------------------------------------`)
        msgs.push(`*  5%* | ${Utils.formatNumber(t.last + t.last * 5 / 100)} | ${Utils.formatNumber(t.last - t.last * 5 / 100)}`)
        msgs.push(`*10%* | ${Utils.formatNumber(t.last + t.last * 10 / 100)} | ${Utils.formatNumber(t.last - t.last * 10 / 100)}`)
        msgs.push(`*15%* | ${Utils.formatNumber(t.last + t.last * 15 / 100)} | ${Utils.formatNumber(t.last - t.last * 15 / 100)}`)
        msgs.push(`*20%* | ${Utils.formatNumber(t.last + t.last * 20 / 100)} | ${Utils.formatNumber(t.last - t.last * 20 / 100)}`)
        msgs.push(`----------------------------------------------`)
        const btn = [{ text: '🚫 REMOVE ALERT', cmd: `alert:remove ${key}` }]
        for (let i = als.alerts.length - 1; i >= 0; i--) {
          const al = als.alerts[i]
          if (al.isAlert(t)) {
            await AlertCommand.Bot.telegram.sendMessage(als.chatId, al.getMessageDone(t), Extra.markdown())
            const rs = await user.removeAlert(al)
            if (rs === 0) try { await AlertCommand.Bot.telegram.deleteMessage(als.chatId, als.messageId) } catch (_e) { }
          } else {
            msgs.push(al.getMessage())
            btn.splice(0, 0, { text: `${i + 1}`, cmd: `alert:remove ${key} ${al.id}` })
          }
        }
        if (btn.length > 1) {
          try {
            await AlertCommand.Bot.telegram.editMessageText(als.chatId, als.messageId, undefined, msgs.join('\n'), Extra.markdown().markup(m => m.inlineKeyboard(
              btn.map(e => m.callbackButton(e.text, e.cmd))
            )))
          } catch (e) {
            console.error(e)
          }
        }
      }
    }
    setTimeout(AlertCommand.runBackground, 5000)
  }

  static initCommand() {
    AlertCommand.Bot.start(async ({ chat, from, reply }) => {
      const user = User.get(from.id)
      user.globalAlertId = chat.id
      await user.save()
      await reply(`Registed global alert`)
    })
    AlertCommand.Bot.hears(/^\/nw( ([\w-]+) (<|<=|>|>=)\s*([.\d]+)(\s(.+))?)?/, async ({ match, from, reply, chat }) => {
      try {
        let [, m] = match
        if (m) {
          let [, , key, operator, num, , des] = match
          key = key.toUpperCase()
          const user = User.get(from.id)
          const rs = await reply(`Added alert for ${key}`)
          const old = await user.addAlert({
            key,
            operator,
            des,
            num: Utils.getQuickPrice(num),
          } as Alert, chat.id, rs.message_id)
          if (old) try { await AlertCommand.Bot.telegram.deleteMessage(old.chatId, old.messageId) } catch (_e) { }
        } else {
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
        }
      } catch (e) {
        await reply(e.message)
      }
    })
    AlertCommand.Bot.action(/alert:remove ([\w-]+)(\s(.+))?/, async ({ match, from, reply }) => {
      try {
        let [, key, , id] = match
        key = key.toUpperCase()
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