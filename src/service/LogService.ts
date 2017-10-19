import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** LogService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Log')
/* tslint:disable */
export class Log {
  _id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  type?: any
  title?: string
  // status?: number
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export class LogService {
  @MONGO()
  private static mongo: Mongo

  static async find(fil = {}) {
    const rs = await LogService.mongo.find<Log>(Log, fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await LogService.mongo.get<Log>(Log, _id)
    return rs
  }

  @VALIDATE((body: Log) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'title', String)
    if (typeof body.type === 'string') {
      Checker.required(body, 'type', String)
    } else {
      Checker.required(body, 'type', Object)
      Checker.required(body.type, 'name', String)
      Checker.required(body.type, 'code', Number)
    }
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Log) {
    const rs = await LogService.mongo.insert<Log>(Log, body)
    return rs
  }

  @VALIDATE((body: Log) => {
    Checker.required(body, '_id', Object)
    Checker.required(body, 'account_id', Uuid)
    body.updated_at = new Date()
    delete body.title
    delete body.type
  })
  static async update(body: Log) {
    const rs = await LogService.mongo.update(Log, body)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((_id: Object) => {
    Checker.required(_id, [, '_id'], Object)
  })
  static async delete(_id: Object) {
    const rs = await LogService.mongo.delete(Log, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }
}
