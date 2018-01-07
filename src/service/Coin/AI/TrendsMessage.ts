import { Mongo, MONGO, Uuid, Collection } from "hinos-mongo/lib/mongo"
import BittrexAnalyticsBot from "./Telegram/BittrexAnalyticsBot";

@Collection('TrendsMessage')
export class TrendsMessage {
  _id?: Uuid
  txt: string
  key: string
  type: string
  style: string
  updated_at: Date
}

export class TrendsMessageService {
  @MONGO('coin')
  private static mongo: Mongo

  static async insert(msgs: TrendsMessage[], type: string) {
    await BittrexAnalyticsBot.postMessage(msgs.map(e => `*${e.key}* _${e.txt}_`).join(`\n`), type)
    await TrendsMessageService.mongo.insert<TrendsMessage>(TrendsMessage, msgs.map(e => {
      e.type = type
      if (!e.style) e.style = 'COIN'
      e.updated_at = new Date()
      return e
    }))
  }

  static async find(fil: any) {
    return await TrendsMessageService.mongo.find<TrendsMessage>(TrendsMessage, {
      $where: fil,
      $sort: {
        updated_at: -1
      }
    })
  }

}