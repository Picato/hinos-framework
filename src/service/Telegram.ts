import * as Telegraf from 'telegraf'

export class BotCommand extends Telegraf {
  
  constructor(token) {
    super(token)
  }

  send(chatid: number, message: string, options?) {
    this['telegram'].sendMessage(chatid, message, options)
  }
  start(cb: (ctx) => void) {
    return super.start(cb)
  }
  command(cmd: string, cb: (ctx) => void) {
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