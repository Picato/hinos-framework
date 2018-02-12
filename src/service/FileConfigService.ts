import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** FileConfigService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('FileConfig')
/* tslint:disable */
export class FileConfig {
  _id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  name: string
  config?: {
    expiredTime: number
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
/* tslint:enable */

export class FileConfigService {
  @MONGO()
  private static mongo: Mongo

  static async find(fil = {}) {
    const rs = await FileConfigService.mongo.find<FileConfig>(FileConfig, fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await FileConfigService.mongo.get<FileConfig>(FileConfig, _id)
    return rs
  }

  @VALIDATE((body: FileConfig) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'name', String)
    Checker.required(body, 'config', Object)
    Checker.required(body.config, 'maxSize', Number)
    Checker.required(body.config, 'maxFile', Number)
    Checker.required(body.config, 'expiredTime', Number)
    Checker.required(body.config, 'ext', String)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: FileConfig) {
    const rs = await FileConfigService.mongo.insert<FileConfig>(FileConfig, body)
    delete rs.account_id
    delete rs.project_id
    return rs
  }

  @VALIDATE((body: FileConfig) => {
    Checker.required(body, '_id', Object)
    Checker.option(body, 'config', Object, () => {
      Checker.required(body.config, 'maxSize', Number)
      Checker.required(body.config, 'maxFile', Number)
      Checker.required(body.config, 'expiredTime', Number)
      Checker.required(body.config, 'ext', String)
    })
    Checker.option(body, 'name', String)
  })
  static async update(body: FileConfig) {
    const rs = await FileConfigService.mongo.update(FileConfig, body)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((_id: Object) => {
    Checker.required(_id, [, '_id'], Object)
  })
  static async delete(_id: Object) {
    const rs = await FileConfigService.mongo.delete(FileConfig, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }
}