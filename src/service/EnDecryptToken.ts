import md5 from 'hinos-common/encrypt/md5'
import { Mongo } from 'hinos-mongo/lib'
import { Redis, REDIS } from 'hinos-redis/lib'
import { AccountCached } from './AccountService'

export default class EnDecryptToken {
  @REDIS()
  private static redis: Redis

  static encryptPwd(pwd) {
    return md5(`${AppConfig.app.prefixPwd || ''}${md5(pwd)}`)
  }

  static generateToken() {
    return md5(`${AppConfig.app.prefixToken || ''}${Math.random()}${Mongo.uuid()}`) as string
  }

  static async getUserByToken(token) {
    return await EnDecryptToken.redis.get(`$tk:${token}`) as AccountCached
  }
}