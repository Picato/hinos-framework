import { REDIS, Redis } from "hinos-redis/lib/redis"

export class TrendingMessage {
  @REDIS()
  private static redis: Redis

  static messages = []

  static async init() {
    const old = await TrendingMessage.redis.lrange('TrendingMessage.messages')
    if (old) {
      TrendingMessage.messages = old.map(e => JSON.parse(e))
    }
  }

  static get() {
    return TrendingMessage.messages
  }

  static async add(message: any) {
    TrendingMessage.messages.splice(0, 0, message)
    await TrendingMessage.redis.lpush('TrendingMessage.messages', JSON.stringify(message))
  }

  static async clear() {
    TrendingMessage.messages = []
    TrendingMessage.redis.del('TrendingMessage.messages')
  }

}