import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser/file'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import Utils from '../common/Utils'
import { REDIS, Redis } from 'hinos-redis'

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

/* tslint:disable */
export class FilesCached {
  _id: string
  project_id?: string | Uuid
  files?: string | string[]
  expired_at?: number

  static castToCached(e) {
    if (!e.expired_at) e.expired_at = new Date()
    return JSON.stringify({
      _id: e._id.toString(),
      files: e.files,
      project_id: e.project_id.toString(),
      expired_at: e.expired_at.getTime()
    })
  }
  static castToObject(_e) {
    const e = JSON.parse(_e)
    e.project_id = Mongo.uuid(e.project_id)
    return e as FilesCached
  }
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

  @REDIS()
  private static redis: Redis

  static async loadIntoCached() {
    await FilesService.redis.del('files.temp')
    const rs = await FilesService.mongo.find<Files>(Files, {
      $where: {
        status: Files.Status.TEMP
      },
      $recordsPerPage: 0,
      $fields: {
        _id: 1, files: 1, project_id: 1, expired_at: 1
      }
    })
    const files = rs.map(FilesCached.castToCached)
    FilesService.redis.rpush('files.temp', files)
    FilesService.syncToRemoveTempFiles()
  }

  static async syncToRemoveTempFiles() {
    const now = new Date().getTime()
    const rs = await FilesService.redis.lrange('files.temp')
    if (rs.length > 0) {
      for (let f of rs.map(FilesCached.castToObject).filter(e => e.expired_at < now)) {
        try {
          await FilesService.delete({
            files: f.files,
            project_id: Mongo.uuid(f.project_id)
          })
        } catch (e) {
          console.error(e)
        }
      }
    }
    setTimeout(FilesService.syncToRemoveTempFiles, AppConfig.app.scanTimeout)
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
        FilesService.redis.rpush('files.temp', FilesCached.castToCached(rs))
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
    FilesService.redis.lrem('files.temp', FilesCached.castToCached(old))
  }

  @VALIDATE((key: Object) => {
    Checker.required(key, [, 'key'], Object)
  })
  static async delete(key: Object) {
    const old = await FilesService.mongo.delete<Files>(Files, key, {
      return: true
    })
    if (!old) throw HttpError.NOT_FOUND('Could not found item to delete')
    FilesService.redis.lrem('files.temp', FilesCached.castToCached(old))
    Utils.deleteUploadFiles(old.files, old.sizes)
  }
}
