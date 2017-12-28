import { REDIS, Redis } from "hinos-redis/lib/redis"

export class TrendingMessage {
  @REDIS()
  private static redis: Redis

  static messages = []

  static async init() {
    const old = await TrendingMessage.redis.lrange('bittrex.trending.messages')
    if (old) {
      TrendingMessage.messages = old.map(e => JSON.parse(e))
    }
  }

  static get() {
    return TrendingMessage.messages
  }

  static async add(message: any) {
    TrendingMessage.messages.splice(message, 0, 0)
    await TrendingMessage.redis.lpush('bittrex.trending.messages', message)
  }

  static async clear() {
    TrendingMessage.messages = []
    TrendingMessage.redis.del('bittrex.trending.messages')
  }

}