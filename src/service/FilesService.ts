import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import Utils from '../common/Utils'
import { ConfigService } from './ConfigService'

/************************************************
 ** FilesService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Files')
export class Files {
  _id?: Uuid
  config_id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  files?: string | string[]
  created_at?: Date
  updated_at?: Date
}

export class FilesService {
  @MONGO()
  private static mongo: Mongo

  static readonly IMAGE_SIZES: ImageResize[] = undefined

  static async find(fil = {}) {
    const rs = await FilesService.mongo.find<Files>(Files.toString(), fil)
    return rs
  }

  @VALIDATE((body: Files) => {
    body._id = <Uuid>Mongo.uuid()
    Checker.required(body, 'config_id', Uuid)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'files', [String, Array])
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Files, validate?: Function) {
    try {
      const rs = await FilesService.mongo.insert<Files>(Files.toString(), body) as Files
      return rs
    } catch (e) {
      Utils.deleteUploadFiles(body.files, this.IMAGE_SIZES)
      throw e
    }
  }

  @VALIDATE((key: Object) => {
    Checker.required(key, [, 'key'], Object)
  })
  static async delete(key: Object) {
    const item = await FilesService.mongo.delete<Files>(Files.toString(), key, {
      return: true
    }) as Files
    if (!item) throw HttpError.NOT_FOUND('Could not found item to delete')
    const config = await ConfigService.get(item.config_id)
    Utils.deleteUploadFiles(item.files, config.config.resize)
  }
}

