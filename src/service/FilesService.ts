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
  meta?: string
  expired_at?: Date
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

/* tslint:disable */
export class FilesCached {
  _id: string | Uuid
  expired_at?: number
  files?: string[]

  static castToCached(_e: Files) {
    const e = {} as FilesCached
    e.expired_at = !_e.expired_at ? new Date().getTime() : _e.expired_at.getTime()
    e._id = _e._id.toString()
    let files = _e.files instanceof Array ? _e.files : [_e.files]
    // files = files.map(e => e.split('?')[0])
    files.forEach(f => {
      // f = f.split('?')[0]
      if (_e.sizes && _e.sizes.length > 0) {
        _e.sizes.forEach(s => {
          if (s.ext) files.push(f.substr(0, f.lastIndexOf('.')) + s.ext + f.substr(f.lastIndexOf('.')))
        })
      }
    })
    return JSON.stringify({
      _id: e._id.toString(),
      expired_at: e.expired_at,
      files
    })
  }
  static castToObject(_e) {
    const e = JSON.parse(_e) as FilesCached
    e._id = Mongo.uuid(e._id)
    return e
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
      $fields: {
        _id: 1, expired_at: 1, files: 1, sizes: 1
      },
      $recordsPerPage: 0,
      $sort: {
        updated_at: 1
      }
    })
    await FilesService.redis.rpush('files.temp', rs.map(FilesCached.castToCached))
    FilesService.syncToRemoveTempFiles()
  }

  static async syncToRemoveTempFiles() {
    const now = new Date().getTime()
    const rs = await FilesService.redis.lrange('files.temp')
    if (rs.length > 0) {
      for (let f of rs.map(FilesCached.castToObject).filter(e => e.expired_at < now)) {
        try {
          await FilesService.delete({
            _id: f._id
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
    Checker.required(body, 'meta', String)
    Checker.option(body, 'status', Number, Files.Status.TEMP)
    Checker.option(body, 'sizes', Array)
    body.created_at = new Date()
    body.updated_at = new Date()
    if (body.status === Files.Status.TEMP)
      body.expired_at = new Date(body.updated_at.getTime() + (config.expiredTime * 1000))
  })
  static async insert(body: Files, _config) {
    try {
      const rs = await FilesService.mongo.insert<Files>(Files, body)
      if (rs.status === Files.Status.TEMP) {
        await FilesService.redis.rpush('files.temp', FilesCached.castToCached(rs))
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
    Checker.required(body, 'account_id', Uuid)
    body.status = Files.Status.SAVED
    body.updated_at = new Date()
    body.expired_at = undefined
  })
  static async store(body: Files) {
    const olds = await FilesService.mongo.update<Files>(Files, body, { return: true, multiple: true }) as Files[]
    if (!olds || olds.length === 0) throw HttpError.NOT_FOUND('Could not found item to store')
    await Promise.all(olds.map(async (old) => {
      await FilesService.redis.lrem('files.temp', FilesCached.castToCached(old))
    }))
  }

  @VALIDATE((key: Object) => {
    Checker.required(key, [, 'key'], Object)
  })
  static async delete(key: Object) {
    const olds = await FilesService.mongo.delete<Files>(Files, key, {
      return: true,
      multiple: true
    }) as Files[]
    if (!olds || olds.length === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
    await Promise.all(olds.map(async (old) => {
      await FilesService.redis.lrem('files.temp', FilesCached.castToCached(old))
      await Utils.deleteUploadFiles(old.files, old.sizes)
    }))
  }
}
