import { Redis, REDIS } from 'hinos-redis/lib/redis'

const Bittrex = require('node-bittrex-api')
Bittrex.options({
  apikey: AppConfig.app.bittrex.apikey,
  apisecret: AppConfig.app.bittrex.apisecret,
  inverse_callback_arguments: true
})

export default class BittrexUser {
  @REDIS()
  private static redis: Redis

  static users = {} as { [username: string]: BittrexUser }
  bittrex: any

  constructor(public username, public apikey) {
    this.bittrex = require('node-bittrex-api') as any;
    this.bittrex.options({
      apikey,
      inverse_callback_arguments: true
    })
  }

  static async reloadFromCached() {
    const bots = await BittrexUser.redis.hget(`bittrex.users`)
    for (let username in bots) {
      const { apikey } = JSON.parse(bots[username])
      const user = new BittrexUser(username, apikey)
      BittrexUser.users[username] = user
    }
  }

  static async add(username, apikey) {
    const user = new BittrexUser(username, apikey)
    BittrexUser.users[username] = user
    await BittrexUser.redis.hset(`bittrex.users`, {
      [username]: JSON.stringify({
        username,
        apikey
      })
    })
    return user
  }

  static getMyBalances(username: string) {
    const user = BittrexUser.users[username]
    if (!user) return Promise.reject('Not found apikey')
    return new Promise<any[]>((resolve, reject) => {
      user.bittrex.getbalances(function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
      });
    })
  }

  static getCurrencies() {
    return new Promise((resolve, reject) => {
      Bittrex.getcurrencies(function (err, data) {
        if (err) return reject(err)
        const coins = data.result.map(e => e.Currency)
        resolve(coins)
      });
    })
  }

  static getMarketSummaries() {
    return new Promise<any[]>((resolve, reject) => {
      Bittrex.getmarketsummaries(function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
      });
    })
  }
}