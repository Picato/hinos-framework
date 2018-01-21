import { Redis, REDIS } from 'hinos-redis/lib/redis';
import { BotCommand } from '../../Telegram/Telegram';
// import * as Markup from 'telegraf/markup'

class BittrexAnalyticsBot {
  @REDIS()
  private redis: Redis

  private bot = new BotCommand(AppConfig.app.telegram.AnalyticsBot)
  private chatId

  async init() {
    const self = this
    this.chatId = await this.redis.hget('BittrexAnalyticsBot.chatid')
    if (!this.chatId) this.chatId = {}
    this.bot.start(async (ctx) => {
      const { reply, chat, message } = ctx
      const [, tblName] = message.text.split(' ')
      self.chatId[tblName] = chat.id
      await this.redis.hset('BittrexAnalyticsBot.chatid', {
        [tblName]: chat.id
      })
      await reply(`Mapped this conversion to ${tblName}`)
    })
    this.bot.startPolling()
  }

  async postMessage(txt, type, opts = { parse_mode: 'Markdown' }) {
    if (this.chatId && this.chatId[type]) {
      await this.bot.send(this.chatId[type], txt, opts)
    }
  }

}

export default new BittrexAnalyticsBot()
