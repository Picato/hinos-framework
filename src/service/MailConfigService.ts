import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** MailConfigService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('MailConfig')
/* tslint:disable */
export class MailConfig {
  _id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  name?: string
  config?: object
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export class MailConfigService {
  @MONGO()
  private static mongo: Mongo

  static async find(fil = {}) {
    const rs = await MailConfigService.mongo.find<MailConfig>(MailConfig, fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await MailConfigService.mongo.get<MailConfig>(MailConfig, _id)
    return rs
  }

  @VALIDATE((body: MailConfig) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'name', String)
    Checker.required(body, 'config', Object)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: MailConfig) {
    const rs = await MailConfigService.mongo.insert<MailConfig>(MailConfig, body)
    return rs
  }

  @VALIDATE((body: MailConfig) => {
    Checker.required(body, '_id', Object)
    Checker.option(body, 'name', String)
    Checker.option(body, 'MailConfig', Object)
    body.updated_at = new Date()
  })
  static async update(body: MailConfig) {
    const rs = await MailConfigService.mongo.update(MailConfig, body)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((_id: Object) => {
    Checker.required(_id, [, '_id'], Object)
  })
  static async delete(_id: Object) {
    const rs = await MailConfigService.mongo.delete(MailConfig, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }
}
