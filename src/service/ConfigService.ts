import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** ConfigService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Config')
export class Config {
  _id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  name: string
  config?: {
    maxFile: number
    maxSize: number
    ext: string,
    resize?: {
      w?: number,
      h?: number,
      ext?: string
    }[]
  }
  created_at?: Date
  updated_at?: Date
}

export class ConfigService {
  @MONGO()
  private static mongo: Mongo

  static async find(fil = {}) {
    const rs = await ConfigService.mongo.find<Config>(Config, fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await ConfigService.mongo.get<Config>(Config, _id)
    return rs
  }

  @VALIDATE((body: Config) => {
    body._id = <Uuid>Mongo.uuid()
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'name', String)
    Checker.option(body, 'config', Object, {
      maxSize: 2046,
      maxFile: 1,
      ext: ".*"
    })
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Config, validate?: Function) {
    const rs = await ConfigService.mongo.insert<Config>(Config, body)
    return rs
  }

  @VALIDATE((body: Config) => {
    Checker.required(body, '_id', Object)
    Checker.option(body, 'config', Object)
    Checker.option(body, 'name', String)
  })
  static async update(body: Config, validate?: Function) {
    const rs = await ConfigService.mongo.update(Config, body)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((_id: Object) => {
    Checker.required(_id, [, '_id'], Object)
  })
  static async delete(_id: Object) {
    const rs = await ConfigService.mongo.delete(Config, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }
}

