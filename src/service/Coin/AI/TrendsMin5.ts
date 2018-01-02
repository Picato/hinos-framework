import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { BittrexMin5Trading } from "../StoreMin5";
import { TrendsMessageService } from "./TrendsMessage";

export default class TrendsMin5 {
  @MONGO('coin')
  private static mongo: Mongo

  static tradings = {} as {
    [key: string]: any[]
  }

  static async execute() {
    let beforeThat = new Date()
    beforeThat.setMinutes(beforeThat.getMinutes() - 50)
    const data = await TrendsMin5.mongo.find<BittrexMin5Trading>(BittrexMin5Trading, {
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
      if (!TrendsMin5.tradings[e.key]) TrendsMin5.tradings[e.key] = []
      TrendsMin5.tradings[e.key].push(e)
    })
    for (let key in TrendsMin5.tradings) {
      const tradings = TrendsMin5.tradings[key]
      let msgs = await Promise.all([
        TrendsMin5.check55Percent(key, tradings[0].percent),
        TrendsMin5.checkRecentlySame(key, tradings)
      ]) as any[]
      msgs = msgs.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), [])
      if (msgs.length > 0) {
        await TrendsMessageService.insert(msgs, 'min5')
      }
    }
  }

  static checkRecentlySame(key, tradings: BittrexMin5Trading[]) {
    return new Promise((resolve) => {
      const msgs = []
      const Step = 2
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