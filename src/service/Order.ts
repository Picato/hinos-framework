import Utils from "../common/Utils";
import * as math from 'mathjs'
import { TradingTemp } from "./Crawler/RawHandler";

export class Order {
  static readonly TypeName = ['GOOD_TIL_CANCELLED', 'IMMEDIATE_OR_CANCEL', 'IMMEDIATE_OR_CANCEL']
  static readonly Type = {
    BID: 0,
    NOW: 1,
    BID_NOW: 3,
    BOT: 2
  }

  static readonly Status = {
    NEW: 0,
    CANCELED: -1,
    FAILED: -2,
    DONE: 1,
    WAITING: 2
  }
  static readonly Action = {
    BUY: -1,
    SELL: 1
  }

  static getOrderId() {
    return new Date().getTime().toString()
  }

  constructor() {

  }

  id: string
  key: string
  quantity: string | number
  price = 0
  firstPrice = 0
  action: number
  type = Order.Type.BID
  status = Order.Status.NEW

  w
  wbs
  bufferRate = 0

  chatId: number
  messageId: number

  orderId: string

  error = [] as string[]
  success = [] as string[]

  isShowPercentLoss = false

  private botEnable

  static getTypeValue(type) {
    return type === '0' ? 'IMMEDIATE_OR_CANCEL' : (type === '1' ? 'GOOD_TIL_CANCELLED' : 'FILL_OR_KILL')
  }

  static calQuantity(total, price) {
    return +(+math.dotDivide(total, price)).toFixed(8)
  }

  getQuantity() {
    if (this.quantity === 'all') {
      if (this.action === Order.Action.BUY) {
        return +(+math.dotDivide(this.w.Available, math.sum(math.dotMultiply(this.price, 0.0025), this.price))).toFixed(8)
      } else {
        return this.wbs.Available
      }
    }
    return +this.quantity
  }
  getSubTotal() {
    const quantity = this.getQuantity()
    return +(quantity * this.price).toFixed(8)
  }
  getCommission() {
    const subTotal = this.getSubTotal()
    return +(subTotal * 0.0025).toFixed(8)
  }
  getTotal() {
    const subTotal = this.getSubTotal()
    const commission = this.getCommission()
    return +(subTotal + commission).toFixed(8)
  }

  canBeOrder(price: number) {
    if (this.action === Order.Action.BUY) {
      if (!this.botEnable) {
        if (price <= this.firstPrice) {
          this.botEnable = true
          this.price = price + this.bufferRate
        }
      } else {
        if (price < this.price)
          this.price = price + this.bufferRate
        else if (price >= this.price && price < this.price + this.bufferRate)
          return true
      }
    } else {
      if (!this.botEnable) {
        if (price >= this.firstPrice) {
          this.botEnable = true
          this.price = price - this.bufferRate
        }
      } else {
        if (price > this.price)
          this.price = price - this.bufferRate
        else if (price <= this.price && price > this.price - this.bufferRate)
          return true
      }
    }
    return false
  }

  static formatOrderForm(t: TradingTemp, od: Order, w, wbs) {
    const [market, coin] = od.key.split('-')
    const msgs = []
    msgs.push(`${od.action === Order.Action.BUY ? 'BUYING' : 'SELLING'} FORM at *${new Date().toTimeString().split(' ')[0]}*`)
    // _${status === undefined ? '' : (status === Order.Status.WAITING ? 'Waiting' : (status === Order.Status.DONE ? 'Done' : 'Canceled'))}_
    const sign = od.action === Order.Action.BUY ? 1 : -1
    const lastPrice = od.type === Order.Type.BID ? t.last : (od.action === Order.Action.BUY ? t.ask : t.bid)
    msgs.push(`----------------------------------------------`)
    msgs.push(`[${od.key}](https://bittrex.com/Market/Index?MarketName=${od.key})    *${Utils.formatNumber(lastPrice)}* ${market} 🚀_${od.type === Order.Type.BID ? 'last' : (od.action === Order.Action.BUY ? 'bid' : 'ask')}_`)
    if (od.type === Order.Type.BID) {
      od.price = od.firstPrice
      msgs.push(`                   _${Utils.formatNumber(od.price - lastPrice, true)}_`)
      msgs.push(`----------------------------------------------`)
      msgs.push(`*📍Mine*    *${Utils.formatNumber(od.price * sign * -1, true)}* ${market} ✅`)
    } else if (od.type === Order.Type.NOW) {
      od.price = lastPrice
    } else if (od.type === Order.Type.BOT) {
      od.price = od.firstPrice
      msgs.push(`                   _${Utils.formatNumber(od.price - lastPrice, true)}_`)
      msgs.push(`----------------------------------------------`)
      msgs.push(`*📍Bot*       *${Utils.formatNumber((od.price + od.bufferRate) * sign * -1, true)}* ${market} 👻`)
      msgs.push(`                      _${Utils.formatNumber(od.firstPrice)} ${market}_`)
      if (od.bufferRate !== 0)
        msgs.push(`                    _+-${Utils.formatNumber(od.bufferRate)} ${market}_`)
    }
    const quantity = od.getQuantity()
    const total = od.getTotal()
    msgs.push(`*Quantity*   ${Utils.formatNumber(quantity * sign, true)} ${coin}`)
    msgs.push(`        *Total*   ${Utils.formatNumber(total * sign * -1, true)} ${market}`)
    let isOk = true
    if (w) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`*Balances 💰*`)
      if (od.action === Order.Action.BUY) {
        msgs.push(`   *${coin}* = ${Utils.formatNumber(wbs.Available)} 🔜 *${Utils.formatNumber(wbs.Available + quantity)}* `)
        msgs.push(`   *${market}* = ${Utils.formatNumber(w.Available)} 🔜 *${Utils.formatNumber(w.Available - total)}* `)
        if (w.Available < total) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (od.price > lastPrice) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price > last price ??? 😱_')
        }
      } else {
        msgs.push(`   *${coin}* = ${Utils.formatNumber(wbs.Available)} 🔜 *${Utils.formatNumber(wbs.Available - quantity)}*`)
        msgs.push(`   *${market}* = ${Utils.formatNumber(w.Available)} 🔜 *${Utils.formatNumber(w.Available + total)}*`)
        if (wbs.Available < quantity) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Insufficient funds 😱_')
          isOk = false
        }
        if (od.price < lastPrice) {
          msgs.push(`----------------------------------------------`)
          msgs.push('_😱 Your order price < last price ??? 😱_')
        }
      }
    }
    if (od.isShowPercentLoss) {
      msgs.push(`----------------------------------------------`)
      msgs.push(`            *TakeProfit*  | *StopLoss*`)
      msgs.push(`*  5%* | ${Utils.formatNumber(od.firstPrice + od.firstPrice * 5 / 100)} | ${Utils.formatNumber(od.firstPrice - od.firstPrice * 5 / 100)}`)
      msgs.push(`*10%* | ${Utils.formatNumber(od.firstPrice + od.firstPrice * 10 / 100)} | ${Utils.formatNumber(od.firstPrice - od.firstPrice * 10 / 100)}`)
      msgs.push(`*15%* | ${Utils.formatNumber(od.firstPrice + od.firstPrice * 15 / 100)} | ${Utils.formatNumber(od.firstPrice - od.firstPrice * 15 / 100)}`)
      msgs.push(`*20%* | ${Utils.formatNumber(od.firstPrice + od.firstPrice * 20 / 100)} | ${Utils.formatNumber(od.firstPrice - od.firstPrice * 20 / 100)}`)
    }
    if (od.error && od.error.length > 0) {
      msgs.push(`----------------------------------------------`)
      msgs.push(od.error.map(e => `☠️ ${e}`).join('\n'))
    }
    if (od.success && od.success.length > 0) {
      msgs.push(`----------------------------------------------`)
      msgs.push(od.success.map(e => `😀 ${e}`).join('\n'))
    }
    return { msgs, isOk }
  }
}