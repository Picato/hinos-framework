import { TradingTemp } from "./Crawler/RawHandler";
import Utils from "../common/Utils";

export class Alerts {
  chatId: number
  messageId: number
  alerts = [] as Alert[]
  histories = [] as { last: number, num: number }[]
  hide = false

  constructor() {
    Object.defineProperty(this, 'histories', {
      enumerable: false
    })
  }
}

export class Alert {

  constructor() {

  }

  id: string
  key: string
  operator: string
  num: number
  des: string

  isAlert(t: TradingTemp) {
    return eval(`${t.last} ${this.operator} ${this.num}`)
  }

  getMessageDone(t: TradingTemp) {
    const msgs = [
      `🎉🎉🎉 [${this.key}](https://bittrex.com/Market/Index?MarketName=${this.key}) 🎉🎉🎉`,
      '-----------------------------------------',
      `*LAST*             ${Utils.formatNumber(t.last)}`,
      `*EXPECTED*   ${this.operator} ${Utils.formatNumber(this.num)}`
    ]
    if (this.des) {
      msgs.push('-----------------------------------------')
      msgs.push(`_${this.des}_`)
    }
    return msgs.join('\n')
  }

  getMessage(last: number, isDes = true) {
    const msgs = []
    msgs.push(`🛎 ${this.operator}${Utils.formatNumber(this.num)} _(${Utils.formatNumber(this.num - last, true)})_`)
    if (this.des && isDes)
      msgs.push(`_${this.des}_`)
    return msgs.join('\n')
  }
}