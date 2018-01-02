import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { BittrexDayTrading } from "../StoreDay";
import { TrendsMessageService } from "./TrendsMessage";

export default class TrendsDay {
  @MONGO('coin')
  private static mongo: Mongo

  static tradings = {} as {
    [key: string]: any[]
  }

  static async execute() {
    let beforeThat = new Date()
    beforeThat.setDate(beforeThat.getDate() - 10)
    const data = await TrendsDay.mongo.find<BittrexDayTrading>(BittrexDayTrading, {
      $where: {
        time: {
          $gte: beforeThat
        }
      },
      $recordsPerPage: 0,
      $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1, prev: 1 },
      $sort: {
        key: 1,
        time: -1
      }
    })
    data.forEach(e => {
      if (!TrendsDay.tradings[e.key]) TrendsDay.tradings[e.key] = []
      TrendsDay.tradings[e.key].push(e)
    })
    for (let key in TrendsDay.tradings) {
      const tradings = TrendsDay.tradings[key]
      let msgs = await Promise.all([
        TrendsDay.check55Percent(key, tradings[0].percent),
        TrendsDay.checkRecentlySame(key, tradings)
      ]) as any[]
      msgs = msgs.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), [])
      if (msgs.length > 0) {
        await TrendsMessageService.insert(msgs, 'day')
      }
    }
  }

  static checkRecentlySame(key, tradings: BittrexDayTrading[]) {
    return new Promise((resolve) => {
      const msgs = []
      const Step = 3
      let c = 0
      let p = 0
      for (let t of tradings) {
        if (!c) {
          c += t.percent > 0 ? 1 : -1
          p += t.percent
        }
        else if (c > 0 && t.percent > 0) {
          c++
          p += t.percent
        }
        else if (c < 0 && t.percent < 0) {
          c--
          p += t.percent
        }
        else
          break
      }
      if (c > Step || c < -Step) {
        if (p > 100) {
          if (c > 0) msgs.push({ key, txt: `Đang tăng mạnh` })
          else if (c < 0) msgs.push({ key, txt: `Đang giảm mạnh` })
        } else {
          if (c > 0) msgs.push({ key, txt: `Đang tăng nhẹ` })
          else if (c < 0) msgs.push({ key, txt: `Đang giảm nhẹ` })
        }
      }
      resolve(msgs)
    })
  }

  static check55Percent(key, percent) {
    return new Promise((resolve) => {
      const Percent = 50
      const msgs = []
      if (percent > Percent) {
        msgs.push({ key, txt: `Chuẩn bị đợt tăng (${percent}%)` })
      } else if (percent < -Percent) {
        msgs.push({ key, txt: `Chuẩn bị đợt giảm (${percent}%)` })
      }
      resolve(msgs)
    })
  }
}