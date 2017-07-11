import * as _ from 'lodash'
import * as path from 'path'
import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo, Uuid } from 'hinos-mongo'
import { Files, FilesService } from '../service/FilesService'
import { ConfigService } from '../service/ConfigService'
import { authoriz } from '../service/Authoriz'
import Utils from '../common/Utils'
import HttpError from '../common/HttpError'

/************************************************
 ** FilesController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class FilesController {

  @POST('/Upload/:configId')
  @INJECT(authoriz(`${AppConfig.name}>Files`, ['INSERT']))
  @MATCHER({
    params: {
      configId: Uuid
    }
  })
  @INJECT(async ({ params, ctx }, next: Function) => {
    const config = await ConfigService.get(params.configId)
    ctx.state.config = config.config
    await next()
  })
  @BODYPARSER([
    {
      autoCreate: true,
      returnType: Object,
      returnPath: "() => `upload/${state.auth.projectId}`",
      name: "files",
      mimes: "() => `${state.config.ext}`",
      limits: {
        fileSize: "() => state.config.maxSize"
      },
      uploadDir: "() => `assets/upload/${state.auth.projectId}`",
      maxCount: "() => state.config.maxFile",
      resize: "() => state.config.resize"
    }
  ], (err, next) => {
    if (err.code && 'LIMIT_UNEXPECTED_FILE' === err.code) throw HttpError.BAD_REQUEST(`The maximum number of files is ${err.ctx.state.config.maxFile}`)
    throw err
  })
  @MATCHER({
    query: {
      store: Boolean,
      name: String
    },
    params: {
      configId: Uuid
    },
    body: {
      files: async (vl, { state, query }) => {
        if (state.config.zip) {
          if (vl instanceof Array) {
            if (vl.length <= 0) return vl
            const fileOut = path.parse(vl[0].path)
            await Utils.zip(vl.map(e => {
              return {
                path: e.path,
                name: e.originalname
              }
            }), path.join(fileOut.dir, `${fileOut.name}.zip`))
            await Utils.deleteUploadFiles(vl.map(e => e.httpPath), state.config.resize)
            const httpName = path.parse(vl[0].httpPath)
            const httpPath = path.join(httpName.dir, `${httpName.name}.zip`)
            return `${httpPath}?name=${query.name || httpName.name}.zip`
          } else {
            const fileName = path.parse(vl.originalname)
            const httpName = path.parse(vl.httpPath)
            await Utils.zip({
              path: vl.path,
              name: fileName.name
            }, `${fileName.name}.zip`)
            await Utils.deleteUploadFiles(vl.path, state.config.resize)
            const httpPath = path.join(httpName.dir, `${httpName.name}.zip`)
            return `${httpPath}?name=${fileName.name}.zip`
          }
        }
        return vl instanceof Array ? vl.map(e => `${e.httpPath}?name=${e.originalname}`) : `${vl.httpPath}?name=${vl.originalname}`
      }
    }
  })
  static async upload({ body, state, params, query }) {
    body.account_id = state.auth.accountId
    body.project_id = state.auth.projectId
    body.config_id = params.configId
    body.status = query.store ? Files.Status.SAVED : Files.Status.TEMP
    body.sizes = state.config.resize
    const files = _.clone(body.files)
    if (body.files instanceof Array) {
      for (const f of files) {
        body.files = f
        await FilesService.insert(body)
      }
    } else {
      await FilesService.insert(body)
    }
    return files
  }

  @PUT('/Store')
  @INJECT(authoriz(`${AppConfig.name}>Files`, ['DELETE']))
  @BODYPARSER()
  @MATCHER({
    body: {
      files: vl => vl instanceof Array ? vl : [vl]
    }
  })
  static async storeFiles({ state, body }) {
    await FilesService.store({
      _id: {
        files: {
          $in: body.files
        },
        account_id: state.auth.accountId,
        project_id: state.auth.projectId
      },
      status: Files.Status.SAVED
    })
  }

  @PUT('/Remove')
  @INJECT(authoriz(`${AppConfig.name}>Files`, ['DELETE']))
  @BODYPARSER()
  @MATCHER({
    body: {
      files: vl => vl instanceof Array ? vl : [vl]
    }
  })
  static async delFiles({ state, body }) {
    for (const file of body.files) {
      await FilesService.delete({
        files: file,
        project_id: state.auth.projectId
      })
    }
  }

  @GET('/Files')
  @INJECT(authoriz(`${AppConfig.name}>Files`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number,
      config_id: Uuid
    }
  })
  static async find({ query, state }) {
    let where: any = {
      project_id: state.auth.projectId
    }
    if (query.config_id) where.config_id = query.config_id
    const rs = await FilesService.find({
      $where: where,
      $sort: {
        updated_at: -1
      },
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

  // @DELETE('/Files/:files')
  // @INJECT(authoriz(`${AppConfig.name}>Files`, ['DELETE']))
  // @MATCHER({
  //   params: {
  //     files: String
  //   }
  // })
  // static async del({ params, state }) {
  //   await FilesService.delete({
  //     files: params.files,
  //     project_id: state.auth.projectId
  //   })
  // }

}
