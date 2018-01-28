import * as _ from 'lodash'
import { Order } from "./Order";
import { Redis } from "hinos-redis/lib/redis";
import HttpError from "../common/HttpError";

export class User {
  static users = [] as User[]

  static async init() {
    const strUser = await Redis.pool().get('users')
    const users = strUser ? JSON.parse(strUser) : []
    User.users = users.map(e => {
      delete e.bittrex
      delete e._bittrex
      e.orders = e.orders.map(o => {
        return _.merge(new Order(), o)
      })
      return _.merge(new User(), e)
    })
  }

  static async add(u: User) {
    let user = User.users.find(e => e.id === u.id)
    if (!user) {
      user = _.merge(new User(), u)
      User.users.push(user)
    } else {
      _.merge(user, u)
    }
    await user.save()
  }

  static get(id) {
    const user = User.users.find(e => e.id === id)
    if (!user) throw HttpError.NOT_FOUND()
    return user
  }

  public id
  public apikey
  public apisecret
  public orders = [] as Order[]
  private _bittrex

  private get bittrex() {
    if (!this._bittrex) {
      this._bittrex = require('node-bittrex-api')
      this._bittrex.options({
        apikey: this.apikey,
        apisecret: this.apisecret,
        inverse_callback_arguments: true
      })
    }
    return this._bittrex
  }

  constructor() {

  }

  async addOrder(od: Order) {
    if (!od.id) od.id = new Date().getTime().toString()
    this.orders.push(_.merge(new Order(), od))
    await this.save()
  }

  async removeOrder(od: Order) {
    const idx = this.orders.findIndex(e => e.id === od.id)
    if (idx !== -1) {
      if (od.orderId)
        await this.cancel(od.orderId)
      this.orders.splice(idx, 1)
    }
    await this.save()
  }

  private cancel(orderId) {
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

  async save() {
    await Redis.pool().set('users', JSON.stringify(User.users))
  }

  buy(o: Order) {
    const self = this
    return new Promise<any[]>((resolve, reject) => {
      self.bittrex.tradebuy({
        MarketName: o.key,
        OrderType: 'LIMIT',
        Quantity: o.getQuantity(),
        Rate: o.price,
        TimeInEffect: Order.TypeName[o.type], // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
        ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
        Target: 0, // used in conjunction with ConditionType
      }, async (err, data) => {
        if (err)
          return reject(err)
        resolve(data.result)
      })
    })
  }

  sell(o: Order) {
    const self = this
    return new Promise<any[]>((resolve, reject) => {
      self.bittrex.tradesell({
        MarketName: o.key,
        OrderType: 'LIMIT',
        Quantity: o.getQuantity(),
        Rate: o.price,
        TimeInEffect: Order.TypeName[o.type], // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
        ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
        Target: 0, // used in conjunction with ConditionType
      }, async (err, data) => {
        if (err)
          return reject(err)
        resolve(data.result)
      })
    })
  }

  getBittrexOrder(o: Order) {
    const self = this
    return new Promise<any>((resolve, reject) => {
      self.bittrex.getorder({
        uuid: o.orderId
      }, function (err, data) {
        if (err) return reject(err.message)
        resolve(data.result)
      })
    })
  }

  getMyOrders(market = '') {
    const self = this
    return new Promise<any[]>((resolve, reject) => {
      self.bittrex.getopenorders({ market }, function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
      });
    })
  }

  getMyBalances() {
    const self = this
    return new Promise<any[]>((resolve, reject) => {
      self.bittrex.getbalances(function (err, data) {
        if (err) return reject(err)
        resolve(data.result)
      });
    })
  }

}