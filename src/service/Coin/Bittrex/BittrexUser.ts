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

  constructor(private username, private apikey, private secretkey, public chatId, public orderIds = []) {
    this.bittrex = require('node-bittrex-api') as any;
    const self = this
    this.bittrex.options({
      apikey: self.apikey,
      apisecret: self.secretkey,
      inverse_callback_arguments: true
    })
  }

  static async reloadFromCached() {
    const bots = await BittrexUser.redis.hget(`bittrex.users`)
    for (let username in bots) {
      const { apikey, secretkey, orderIds, chatId } = JSON.parse(bots[username])
      const user = new BittrexUser(username, apikey, secretkey, chatId, orderIds)
      BittrexUser.users[username] = user
    }
  }

  static async add(username, apikey, secretkey, chatId) {
    const user = new BittrexUser(username, apikey, secretkey, chatId)
    BittrexUser.users[username] = user
    await user.saveToCached()
    return user
  }

  async saveToCached() {
    const self = this
    await BittrexUser.redis.hset(`bittrex.users`, {
      [self.username]: JSON.stringify({
        username: self.username,
        apikey: self.apikey,
        secretkey: self.secretkey,
        chatId: self.chatId,
        orderIds: self.orderIds
      })
    })
  }

  getOrderBook(key, type: 'both' | 'sell' | 'buy') {
    const self = this
    return new Promise<any>((resolve, reject) => {
      self.bittrex.getorderbook({
        type,
        market: key
      }, function (err, data) {
        if (err) return reject(err.message)
        resolve(data.result)
      })
    })
  }

  getOrder(orderId: string) {
    if (!orderId) return Promise.reject('Not found orderID')
    const self = this
    return new Promise<any>((resolve, reject) => {
      self.bittrex.getorder({
        uuid: orderId
      }, function (err, data) {
        if (err) return reject(err.message)
        resolve(data.result)
      })
    })
  }

  async addOrder(orderId, chatId, messageId) {
    this.orderIds.push({ orderId, chatId, messageId })
    await this.saveToCached()
  }

  async removeOrder(orderId) {
    const idx = this.orderIds.findIndex(e => e.orderId === orderId)
    if (idx !== -1) {
      this.orderIds.splice(idx, 1)
      await this.saveToCached()
    }
  }

  buy(key: string, quantity: number, money: number, type = 'GOOD_TIL_CANCELLED') {
    if (!key) return Promise.reject('Not found Market-Coin')
    if (!money) return Promise.reject('Not found money')
    const self = this
    return new Promise<any[]>((resolve, reject) => {
      self.bittrex.tradebuy({
        MarketName: key,
        OrderType: 'LIMIT',
        Quantity: quantity,
        Rate: money,
        TimeInEffect: type, // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
        ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
        Target: 0, // used in conjunction with ConditionType
      }, async (err, data) => {
        if (err) return reject(err.message)
        resolve(data.result)
      })
    })
  }

  sell(key: string, quantity: number, money: number, type = 'GOOD_TIL_CANCELLED') {
    if (!key) return Promise.reject('Not found Market-Coin')
    if (!money) return Promise.reject('Not found money')
    const self = this
    return new Promise<any[]>((resolve, reject) => {
      self.bittrex.tradesell({
        MarketName: key,
        OrderType: 'LIMIT',
        Quantity: quantity,
        Rate: money,
        TimeInEffect: type, // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
        ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
        Target: 0, // used in conjunction with ConditionType
      }, async (err, data) => {
        if (err) return reject(err.message)
        resolve(data.result)
      })
    })
  }

  cancel(orderId: string) {
    if (!orderId) return Promise.reject('Not found Order ID')
    const self = this
    return new Promise<any[]>((resolve, reject) => {
      self.bittrex.cancel({
        uuid: orderId
      }, async (err, data) => {
        if (err) return reject(err.message)
        resolve(data.result)
      })
    })
  }

  static getMyOrders(username: string, market?: string) {
    const user = BittrexUser.users[username]
    if (!user) return Promise.reject('Not found apikey')
    return new Promise<any[]>((resolve, reject) => {
      user.bittrex.getopenorders({ market }, function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
      });
    })
  }

  static getMyOrder(username: string, orderId: string) {
    const user = BittrexUser.users[username]
    if (!user) return Promise.reject('Not found apikey')
    return new Promise<any[]>((resolve, reject) => {
      user.bittrex.getorder({ uuid: orderId }, function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
      });
    })
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