import * as Extra from 'telegraf/extra'
import { REDIS, Redis } from "hinos-redis/lib/redis";
import { TradingTemp } from '../Crawler/RawHandler';
import { User } from '../User';
import AlertCommand from '../Telegram/AlertCommand';
import { TRACE } from '../../common/Tracer';

const MAX_RECORDS = 60
const MIN_RECORDS = 30
const LEVEL_PUMP = [
  {
    NUM_OF_HISTORY: 12,
    NUM_OF_PASS: 9
  },
  {
    NUM_OF_HISTORY: 24,
    NUM_OF_PASS: 20
  },
  {
    NUM_OF_HISTORY: 36,
    NUM_OF_PASS: 30
  }
]
const LEVEL_DUMP = [
  {
    NUM_OF_HISTORY: 12,
    NUM_OF_PASS: 9
  },
  {
    NUM_OF_HISTORY: 24,
    NUM_OF_PASS: 20
  },
  {
    NUM_OF_HISTORY: 36,
    NUM_OF_PASS: 30
  }
]

export class PDumping {
  @REDIS()
  static redis: Redis

  private static historyAsk = {} as { [key: string]: { buf: number, value: number }[] }
  private static historyBid = {} as { [key: string]: { buf: number, value: number }[] }

  private static cachedMesLength = 0

  static async init() {

  }

  @TRACE()
  static async handleDumpPump(tradings: TradingTemp[]) {
    const msgsPump = [] as { key: string, level: number }[]
    const msgsDump = [] as { key: string, level: number }[]
    for (let t of tradings) {
      const rs = await PDumping.addHistory(t.key, t.ask, t.bid)
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
      if (mes.length !== PDumping.cachedMesLength) {
        PDumping.cachedMesLength = mes.length
        for (let u of User.users) {
          if (u.globalAlertId) {
            await AlertCommand.Bot.relegram.sendMessage(u.globalAlertId, mes, Extra.markdown())
          }
        }
      }
    }
  }

  private static async addHistory(key: string, ask: number, bid: number) {
    if (!PDumping.historyAsk[key]) PDumping.historyAsk[key] = [] as any
    const rs = {
      pump: -1,
      dump: -1
    } as any
    const askBefore = PDumping.historyAsk[key][0] || { buf: 0, value: 0 }
    const vlAsk = ask - askBefore.value
    if (vlAsk !== 0) {
      PDumping.historyAsk[key].splice(0, 0, { buf: vlAsk, value: ask })
      if (PDumping.historyAsk[key].length > MAX_RECORDS)
        PDumping.historyAsk[key].splice(MAX_RECORDS, 1)
      if (PDumping.historyAsk[key].length >= MIN_RECORDS)
        rs.pump = PDumping.checkPump(key)
    }

    if (!PDumping.historyBid[key]) PDumping.historyBid[key] = [] as any
    const bidBefore = PDumping.historyBid[key][0] || { buf: 0, value: 0 }
    const vlBid = bid - bidBefore.value
    if (vlBid !== 0) {
      PDumping.historyBid[key].splice(0, 0, { buf: vlBid, value: bid })
      if (PDumping.historyBid[key].length > MAX_RECORDS)
        PDumping.historyBid[key].splice(MAX_RECORDS, 1)
      if (PDumping.historyAsk[key].length >= MIN_RECORDS)
        rs.dump = PDumping.checkDump(key)
    }
    return rs
  }

  private static checkPump(key) {
    for (let i = LEVEL_PUMP.length - 1; i >= 0; i--) {
      const p = LEVEL_PUMP[i]
      if (p.NUM_OF_HISTORY === PDumping.historyAsk[key].length) {
        const c = PDumping.historyAsk[key].slice(0, p.NUM_OF_HISTORY).reduce((sum, e) => {
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
      const c = PDumping.historyBid[key].slice(0, p.NUM_OF_HISTORY).reduce((sum, e) => {
        return sum + (e.buf < 0 ? 1 : 0)
      }, 0)
      if (c >= p.NUM_OF_PASS)
        return i
    }
    return -1
  }

}