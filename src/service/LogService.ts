import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'

/************************************************
 ** LogService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Log')
/* tslint:disable */
export class Log {
  _id?: Uuid
  service_id?: Uuid
  status?: number
  error?: string
  created_at?: Date
}
/* tslint:enable */

export class LogService {
  @MONGO()
  private static mongo: Mongo

  static async find(fil = {}) {
    const rs = await LogService.mongo.find<Log>(Log, fil)
    return rs
  }

  @VALIDATE((body: Log) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'status', Number)
    Checker.option(body, 'error', String)
    Checker.required(body, 'service_id', Uuid)
    body.created_at = new Date()
  })
  static async insert(body: Log) {
    const rs = await LogService.mongo.insert<Log>(Log, body)
    return rs
  }
}
