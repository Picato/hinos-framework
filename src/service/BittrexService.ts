// import { Redis, REDIS } from 'hinos-redis/lib/redis'
// import HttpError from '../common/HttpError'

const Bittrex = require('node-bittrex-api')
Bittrex.options({
  inverse_callback_arguments: true
})





export default class BittrexService {
  // static readonly ORDER_TYPE = ['IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL']

  // @REDIS()
  // private static redis: Redis

  

  // static async init() {
  //   const bots = await BittrexService.redis.get(`bittrex.users`)
  //   for (let username in bots) {

  //     User.users[username] = user
  //   }
  // }

  // static async add(username, apikey, secretkey, chatId) {
  //   const user = new User(username, apikey, secretkey, chatId)
  //   User.users[username] = user
  //   await user.saveToCached()
  //   return user
  // }

  // async saveToCached() {
  //   const self = this
  //   await BittrexService.redis.hset(`bittrex.users`, {
  //     [self.username]: JSON.stringify({
  //       username: self.username,
  //       apikey: self.apikey,
  //       secretkey: self.secretkey,
  //       chatId: self.chatId,
  //       orderIds: self.orderIds,
  //       botOrders: self.botOrders
  //     })
  //   })
  // }

  static getMarketSummaries() {
    return new Promise<any[]>((resolve, reject) => {
      Bittrex.getmarketsummaries(function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
      });
    })
  }
}