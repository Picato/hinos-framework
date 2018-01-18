import * as Telegraf from 'telegraf'

export class BotCommand extends Telegraf {

  constructor(token) {
    super(token)
    const self = this as any
    self.catch(err => console.error(err))
  }
  async sendChatAction(chatid: number, action) {
    await this['telegram'].sendChatAction(chatid, action)
  }
  async send(chatid: number, message: string, options?) {
    return await this['telegram'].sendMessage(chatid, message, options)
  }
  async pinChatMessage(chatId, messageId, extra) {
    return this['telegram'].pinChatMessage(chatId, messageId, extra)
  }
  editMessageReplyMarkup(chatId, messageId, inlineMessageId, markup) {
    return this['telegram'].editMessageReplyMarkup(chatId, messageId, inlineMessageId, markup)
  }
  editMessageText(chatId, messageId, inlineMessageId, text, extra) {
    return this['telegram'].editMessageText(chatId, messageId, inlineMessageId, text, extra)
  }
  deleteMessage(chatId, messageId) {
    return this['telegram'].deleteMessage(chatId, messageId)
  }
  start(cb: (ctx) => void) {
    return super.start(cb)
  }
  command(cmd: string | RegExp, cb: (ctx) => void) {
    return super.command(cmd, cb)
  }
  hears(cmd: string | RegExp, cb: (ctx) => void) {
    return super.hears(cmd, cb)
  }
  on(cmd: string, cb: (ctx) => void) {
    return super.on(cmd, cb)
  }
  action(action: string | RegExp, cb: (ctx, next) => void) {
    return super.action(action, cb)
  }
  startPolling() {
    return super.startPolling()
  }
  // const bot = new Telegraf(token)
  // bot.command('help', (ctx) => ctx.reply('Try send a sticker!'))
  // bot.hears('hi', (ctx) => ctx.reply('Hey there!'))
  // bot.hears(/buy/i, (ctx) => ctx.reply('Buy-buy!'))
  // bot.on('sticker', (ctx) => ctx.reply('👍'))
  // bot.startPolling()
}