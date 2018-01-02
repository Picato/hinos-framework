import { Mongo, MONGO, Uuid, Collection } from "hinos-mongo/lib/mongo"

@Collection('TrendsMessage')
export class TrendsMessage {
  _id?: Uuid
  txt: string
  key: string
  type: string
  updated_at: Date
}

export class TrendsMessageService {
  @MONGO('coin')
  private static mongo: Mongo

  static async insert(msgs: TrendsMessage[], type: string) {
    await TrendsMessageService.mongo.insert<TrendsMessage>(TrendsMessage, msgs.map(e => {
      e.type = type
      e.updated_at = new Date()
      return e
    }))
  }

  static async find(fil: any, type: string) {
    return await TrendsMessageService.mongo.find<TrendsMessage>(TrendsMessage, {
      $where: {
        type
      },
      $sort: {
        updated_at: -1
      }
    })
  }

}