import * as Extra from 'telegraf/extra'
import { REDIS, Redis } from "hinos-redis/lib/redis";
import { TradingTemp } from '../Crawler/RawHandler';
import { User } from '../User';
import AlertCommand from '../Telegram/AlertCommand';
import { TRACE } from '../../common/Tracer';
import Utils from '../../common/Utils';

const MAX_RECORDS = 48
const MIN_RECORDS = 24
const LEVEL_PUMP = [
  {
    NUM_OF_HISTORY: 24,
    NUM_OF_PASS: 20
  },
  {
    NUM_OF_HISTORY: 36,
    NUM_OF_PASS: 30
  },
  {
    NUM_OF_HISTORY: 48,
    NUM_OF_PASS: 40
  }
]
const LEVEL_DUMP = [
  {
    NUM_OF_HISTORY: 24,
    NUM_OF_PASS: 20
  },
  {
    NUM_OF_HISTORY: 36,
    NUM_OF_PASS: 30
  },
  {
    NUM_OF_HISTORY: 48,
    NUM_OF_PASS: 40
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
    const msgsPump = [] as { key: string, level: number, percent: number, rate: string }[]
    const msgsDump = [] as { key: string, level: number, percent: number, rate: string }[]
    for (let t of tradings) {
      const rs = await PDumping.addHistory(t.key, t.ask, t.bid)
      if (rs.pump.level !== -1) msgsPump.push(Object.assign({}, { key: t.key }, rs.pump) as any)
      if (rs.dump.level !== -1) msgsDump.push(Object.assign({}, { key: t.key }, rs.dump) as any)
    }
    let msgs = []
    if (msgsPump.length > 0) {
      msgsPump.sort((a, b) => b.level - a.level)
      msgs.push(`PUMPING 👍`)
      msgs.push(`-------------------------------`)
      msgs = msgs.concat(msgsPump.map(e => `[${e.key}](https://bittrex.com/Market/Index?MarketName=${e.key}) Lv ${e.level + 1}|${e.rate} _(${e.percent}%)_`))
      msgs.push(`-------------------------------`)
    }
    if (msgsDump.length > 0) {
      msgsDump.sort((a, b) => b.level - a.level)
      msgs.push(`👎 DUMPING`)
      msgs.push(`-------------------------------`)
      msgs = msgs.concat(msgsDump.map(e => `[${e.key}](https://bittrex.com/Market/Index?MarketName=${e.key}) Lv ${e.level + 1}|${e.rate} _(${e.percent}%)_`))
      msgs.push(`-------------------------------`)
    }
    if (msgs.length > 0) {
      const mes = msgs.join('\n')
      if (mes.length !== PDumping.cachedMesLength) {
        PDumping.cachedMesLength = mes.length
        for (let u of User.users) {
          if (u.globalAlertId) {
            await AlertCommand.Bot.telegram.sendMessage(u.globalAlertId, mes, Extra.markdown())
          }
        }
      }
    }
  }

  private static async addHistory(key: string, ask: number, bid: number) {
    if (!PDumping.historyAsk[key]) PDumping.historyAsk[key] = [] as any
    const rs = {
      pump: {
        level: -1,
        percent: '',
        rate: ''
      },
      dump: {
        level: -1,
        percent: '',
        rate: ''
      }
    }
    const askBefore = PDumping.historyAsk[key][0] || { buf: 0, value: 0 }
    const vlAsk = ask - askBefore.value
    if (vlAsk !== 0) {
      PDumping.historyAsk[key].splice(0, 0, { buf: vlAsk, value: ask })
      if (PDumping.historyAsk[key].length > MAX_RECORDS)
        PDumping.historyAsk[key].splice(MAX_RECORDS, 1)
      if (PDumping.historyAsk[key].length >= MIN_RECORDS) {
        const rss = PDumping.checkPump(key)
        rs.pump.level = rss.level
        rs.pump.percent = rss.percent
        rs.pump.rate = rss.rate
      }
    }

    if (!PDumping.historyBid[key]) PDumping.historyBid[key] = [] as any
    const bidBefore = PDumping.historyBid[key][0] || { buf: 0, value: 0 }
    const vlBid = bid - bidBefore.value
    if (vlBid !== 0) {
      PDumping.historyBid[key].splice(0, 0, { buf: vlBid, value: bid })
      if (PDumping.historyBid[key].length > MAX_RECORDS)
        PDumping.historyBid[key].splice(MAX_RECORDS, 1)
      if (PDumping.historyAsk[key].length >= MIN_RECORDS) {
        const rss = PDumping.checkDump(key)
        rs.dump.level = rss.level
        rs.dump.percent = rss.percent
        rs.dump.rate = rss.rate
      }
    }
    return rs
  }

  private static checkPump(key) {
    for (let i = LEVEL_PUMP.length - 1; i >= 0; i--) {
      const p = LEVEL_PUMP[i]
      if (p.NUM_OF_HISTORY <= PDumping.historyAsk[key].length) {
        const c = PDumping.historyAsk[key].slice(0, p.NUM_OF_HISTORY).reduce((sum, e) => {
          return sum + (e.buf > 0 ? 1 : 0)
        }, 0)
        if (c >= p.NUM_OF_PASS) {
          return { level: i, rate: `${c}/${p.NUM_OF_HISTORY}`, percent: Utils.formatNumber((PDumping.historyAsk[key][0].value - PDumping.historyAsk[key][p.NUM_OF_HISTORY - 1].value) * 100 / PDumping.historyAsk[key][p.NUM_OF_HISTORY - 1].value) }
        }
      }
    }
    return { level: -1, percent: undefined, rate: undefined }
  }

  private static checkDump(key) {
    for (let i = LEVEL_DUMP.length - 1; i >= 0; i--) {
      const p = LEVEL_DUMP[i]
      if (p.NUM_OF_HISTORY <= PDumping.historyBid[key].length) {
        const c = PDumping.historyBid[key].slice(0, p.NUM_OF_HISTORY).reduce((sum, e) => {
          return sum + (e.buf < 0 ? 1 : 0)
        }, 0)
        if (c >= p.NUM_OF_PASS) {
          return { level: i, rate: `${c}/${p.NUM_OF_HISTORY}`, percent: Utils.formatNumber((PDumping.historyAsk[key][0].value - PDumping.historyAsk[key][p.NUM_OF_HISTORY - 1].value) * 100 / PDumping.historyAsk[key][p.NUM_OF_HISTORY - 1].value) }
        }
      }
    }
    return { level: -1, percent: undefined, rate: undefined }
  }

}