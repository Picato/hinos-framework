import { TradingTemp } from "../Crawler/RawHandler";
import BittrexAlert from "../Telegram/BittrexAlert";
import * as Extra from 'telegraf/extra'
// import { REDIS, Redis } from "hinos-redis/lib/redis";

// 4 secs
const MAX_RECORDS = 60
const MIN_RECORDS = 30
const LEVEL_PUMP = [
  {
    NUM_OF_HISTORY: 30,
    NUM_OF_PASS: 25
  },
  {
    NUM_OF_HISTORY: 45,
    NUM_OF_PASS: 35
  },
  {
    NUM_OF_HISTORY: 60,
    NUM_OF_PASS: 55
  }
]
const LEVEL_DUMP = [
  {
    NUM_OF_HISTORY: 15,
    NUM_OF_PASS: 9
  }, {
    NUM_OF_HISTORY: 30,
    NUM_OF_PASS: 18
  }
]

export class BittrexAlertPumpDump {
  // @REDIS()
  // static redis: Redis

  private static historyAsk = {} as { [key: string]: { buf: number, value: number }[] }
  private static historyBid = {} as { [key: string]: { buf: number, value: number }[] }

  private static cachedMesLength = 0

  static async init() {
    // const str = await BittrexAlertPumpDump.redis.get('bittrex.pumpdump')
    // if (str) {
    //   const tmp = JSON.parse(str)
    //   BittrexAlertPumpDump.historyAsk = tmp.historyAsk
    //   BittrexAlertPumpDump.historyBid = tmp.historyBid
    // }
  }

  static async runBackground(tradings: TradingTemp[]) {
    const msgsPump = [] as { key: string, level: number }[]
    const msgsDump = [] as { key: string, level: number }[]
    for (let t of tradings) {
      const rs = await BittrexAlertPumpDump.addHistory(t.key, t.ask, t.bid)
      if (rs.pump !== -1) msgsPump.push({ key: t.key, level: rs.pump })
      if (rs.dump !== -1) msgsDump.push({ key: t.key, level: rs.dump })
    }
    let msgs = []
    if (msgsPump.length > 0) {
      msgsPump.sort((a, b) => b.level - a.level)
      msgs.push(`PUMPING`)
      msgs.push(`-------------------------------`)
      msgs = msgs.concat(msgsPump.map(e => `[${e.key}](https://bittrex.com/Market/Index?MarketName=${e.key}) Level ${e.level + 1}`))
      msgs.push(`-------------------------------`)
    }
    if (msgsDump.length > 0) {
      msgsDump.sort((a, b) => b.level - a.level)
      msgs.push(`DUMPING`)
      msgs.push(`-------------------------------`)
      msgs = msgs.concat(msgsDump.map(e => `[${e.key}](https://bittrex.com/Market/Index?MarketName=${e.key}) Level ${e.level + 1}`))
      msgs.push(`-------------------------------`)
    }
    if (msgs.length > 0) {
      const mes = msgs.join('\n')
      if (mes.length !== BittrexAlertPumpDump.cachedMesLength) {
        BittrexAlertPumpDump.cachedMesLength = mes.length
        for (let user in BittrexAlert.notifications) {
          const al = BittrexAlert.notifications[user]
          if (al) {
            const rs = await BittrexAlert.Bot.send(al.chatId, mes, Extra.markdown())
            al.messageId = rs.message_id
          }
        }
      }
    }
  }

  private static async addHistory(key: string, ask: number, bid: number) {
    if (!BittrexAlertPumpDump.historyAsk[key]) BittrexAlertPumpDump.historyAsk[key] = [] as any
    const rs = {
      pump: -1,
      dump: -1
    } as any
    const askBefore = BittrexAlertPumpDump.historyAsk[key][0] || { buf: 0, value: 0 }
    const vlAsk = ask - askBefore.value
    if (vlAsk !== 0) {
      BittrexAlertPumpDump.historyAsk[key].splice(0, 0, { buf: vlAsk, value: ask })
      if (BittrexAlertPumpDump.historyAsk[key].length > MAX_RECORDS)
        BittrexAlertPumpDump.historyAsk[key].splice(MAX_RECORDS, 1)
      if (BittrexAlertPumpDump.historyAsk[key].length >= MIN_RECORDS)
        rs.pump = BittrexAlertPumpDump.checkPump(key)
    }

    if (!BittrexAlertPumpDump.historyBid[key]) BittrexAlertPumpDump.historyBid[key] = [] as any
    const bidBefore = BittrexAlertPumpDump.historyBid[key][0] || { buf: 0, value: 0 }
    const vlBid = bid - bidBefore.value
    if (vlBid !== 0) {
      BittrexAlertPumpDump.historyBid[key].splice(0, 0, { buf: vlBid, value: bid })
      if (BittrexAlertPumpDump.historyBid[key].length > MAX_RECORDS)
        BittrexAlertPumpDump.historyBid[key].splice(MAX_RECORDS, 1)
      if (BittrexAlertPumpDump.historyAsk[key].length >= MIN_RECORDS)
        rs.dump = BittrexAlertPumpDump.checkDump(key)
    }
    return rs
    // if (vlBid !== 0 || vlAsk !== 0) {
    //   await BittrexAlertPumpDump.redis.set('bittrex.pumpdump', JSON.stringify({
    //     historyAsk: BittrexAlertPumpDump.historyAsk,
    //     historyBid: BittrexAlertPumpDump.historyBid
    //   }))
    // }
  }

  private static checkPump(key) {
    for (let i = LEVEL_PUMP.length - 1; i >= 0; i--) {
      const p = LEVEL_PUMP[i]
      if (p.NUM_OF_HISTORY === BittrexAlertPumpDump.historyAsk[key].length) {
        const c = BittrexAlertPumpDump.historyAsk[key].slice(0, p.NUM_OF_HISTORY).reduce((sum, e) => {
          return sum + (e.buf > 0 ? 1 : 0)
        }, 0)
        if (c >= p.NUM_OF_PASS)
          return i
      }
    }
    return -1
  }

  private static checkDump(key) {
    for (let i = LEVEL_DUMP.length - 1; i >= 0; i--) {
      const p = LEVEL_DUMP[i]
      const c = BittrexAlertPumpDump.historyBid[key].slice(0, p.NUM_OF_HISTORY).reduce((sum, e) => {
        return sum + (e.buf < 0 ? 1 : 0)
      }, 0)
      if (c >= p.NUM_OF_PASS)
        return i
    }
    return -1
  }

}