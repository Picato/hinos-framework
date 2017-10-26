import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser/file'
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
  expired_at?: Date
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

  private static tempFiles = [] as any

  static async loadIntoCached() {
    const rs = await FilesService.mongo.find<Files>(Files, {
      $where: {
        status: Files.Status.TEMP
      },
      $recordsPerPage: 0,
      $fields: {
        _id: 1, files: 1, project_id: 1, expired_at: 1
      }
    })
    const files = rs.map(e => {
      e.expired_at = e.expired_at ? e.expired_at.getTime() as any : new Date().getTime()
      return e
    })
    FilesService.tempFiles = FilesService.tempFiles.concat(files)
    FilesService.syncToRemoveTempFiles()
  }

  static async syncToRemoveTempFiles() {
    const now = new Date().getTime()
    const rs = FilesService.tempFiles
    if (rs.length > 0) {
      for (let f of rs.filter(e => e.expired_at < now)) {
        try {
          await FilesService.delete({
            files: f.files,
            project_id: f.project_id
          })
        } catch (e) {
          console.error(e)
        }
      }
    }
    setTimeout(FilesService.syncToRemoveTempFiles, 1000)
  }

  static async find(fil = {}) {
    const rs = await FilesService.mongo.find<Files>(Files, fil)
    return rs
  }

  @VALIDATE((body: Files, config) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'config_id', Uuid)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'files', [String, Array])
    Checker.option(body, 'status', Number, Files.Status.TEMP)
    Checker.option(body, 'sizes', Array)
    body.created_at = new Date()
    body.updated_at = new Date()
    body.expired_at = new Date(body.updated_at.getTime() + (config.expiredTime * 1000))
  })
  static async insert(body: Files, _config) {
    try {
      const rs = await FilesService.mongo.insert<Files>(Files, body)
      if (rs.status === Files.Status.TEMP) {
        FilesService.tempFiles.push({
          _id: rs._id,
          project_id: rs.project_id,
          expired_at: rs.expired_at,
          files: rs.files
        })
      }
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
    body.status = Files.Status.SAVED
    body.updated_at = new Date()
  })
  static async store(body: Files) {
    const old = await FilesService.mongo.update<Files>(Files, body, { return: true })
    if (!old) throw HttpError.NOT_FOUND('Could not found item to store')
    const idx = FilesService.tempFiles.findIndex(e => e._id.toString() === old._id.toString())
    FilesService.tempFiles.splice(idx, 1)
  }

  @VALIDATE((key: Object) => {
    Checker.required(key, [, 'key'], Object)
  })
  static async delete(key: Object) {
    const item = await FilesService.mongo.delete<Files>(Files, key, {
      return: true
    })
    if (!item) throw HttpError.NOT_FOUND('Could not found item to delete')
    const idx = FilesService.tempFiles.findIndex(e => e._id.toString() === item._id.toString())
    FilesService.tempFiles.splice(idx, 1)
    Utils.deleteUploadFiles(item.files, item.sizes)
  }
}
