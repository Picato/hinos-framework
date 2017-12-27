import * as Telegraf from 'telegraf'
import axios from 'axios'

export class BotFather {
  constructor(private token, private chatID) { }
  send(text, opts = {}) {
    axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, Object.assign({}, { text: text, chat_id: this.chatID }, opts), {
      headers: {
        'content-type': 'application/json'
      }
    })
  }
}

export interface IBotCommand {

}

export class BotCommand extends Telegraf {
  constructor(token) {
    super(token)
  }
  // const bot = new Telegraf(token)
  // bot.command('help', (ctx) => ctx.reply('Try send a sticker!'))
  // bot.hears('hi', (ctx) => ctx.reply('Hey there!'))
  // bot.hears(/buy/i, (ctx) => ctx.reply('Buy-buy!'))
  // bot.on('sticker', (ctx) => ctx.reply('👍'))
  // bot.startPolling()
}