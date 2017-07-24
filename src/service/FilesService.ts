import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import Utils from '../common/Utils'

/************************************************
 ** FilesService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Files')
/* tslint:disable */
export class Files {
  _id?: Uuid
  config_id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  status?: number
  sizes?: ImageResize[]
  files?: string | string[]
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export namespace Files {
  export const Status = {
    TEMP: 0,
    SAVED: 1
  }
}

export class FilesService {
  @MONGO()
  private static mongo: Mongo

  static async syncToRemoveTempFiles() {
    const timeToDelete = new Date(new Date().getTime() - AppConfig.app.periodToDelete)
    const rs = await FilesService.mongo.find<Files>(Files, {
      $where: {
        status: Files.Status.TEMP,
        updated_at: {
          $lte: timeToDelete
        }
      },
      $fields: {
        files: 1, project_id: 1
      }
    })
    for (let f of rs) {
      await FilesService.delete({
        files: f.files,
        project_id: f.project_id
      })
    }
    setTimeout(FilesService.syncToRemoveTempFiles, AppConfig.app.scanTimeout)
  }

  static async find(fil = {}) {
    const rs = await FilesService.mongo.find<Files>(Files, fil)
    return rs
  }

  @VALIDATE((body: Files) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'config_id', Uuid)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'files', [String, Array])
    Checker.option(body, 'status', Number, Files.Status.TEMP)
    Checker.option(body, 'sizes', Array)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Files) {
    try {
      const rs = await FilesService.mongo.insert<Files>(Files, body)
      return rs
    } catch (e) {
      Utils.deleteUploadFiles(body.files, body.sizes)
      throw e
    }
  }

  @VALIDATE((body: Files) => {
    Checker.required(body._id, 'files', Object)
    Checker.required(body._id, 'project_id', Uuid)
    Checker.required(body._id, 'account_id', Uuid)
    Checker.option(body, 'status', Number, Files.Status.TEMP)
    body.updated_at = new Date()
  })
  static async store(body: Files) {
    const rs = await FilesService.mongo.update(Files, body)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to store')
  }

  @VALIDATE((key: Object) => {
    Checker.required(key, [, 'key'], Object)
  })
  static async delete(key: Object) {
    const item = await FilesService.mongo.delete<Files>(Files, key, {
      return: true
    })
    if (!item) throw HttpError.NOT_FOUND('Could not found item to delete')
    Utils.deleteUploadFiles(item.files, item.sizes)
  }
}
