import * as _ from 'lodash'
import * as path from 'path'
import { POST, PUT, INJECT } from 'hinos-route'
import { FILEPARSER } from 'hinos-bodyparser/file'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { Files, FilesService } from '../service/FilesService'
import { FileConfigService } from '../service/FileConfigService'
import { authoriz } from '../service/Authoriz'
import Utils from '../common/Utils'
import HttpError from '../common/HttpError'

/************************************************
 ** ClientController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ClientController {

  @POST('/Upload/:configId')
  @INJECT(authoriz(`${AppConfig.path}`, 'UPLOAD'))
  @RESTRICT({
    params: {
      configId: Mongo.uuid
    }
  })
  @INJECT(async ({ params, ctx }, next: Function) => {
    const config = await FileConfigService.get(params.configId)
    ctx.state.config = config.config
    await next()
  })
  @FILEPARSER([
    {
      autoCreate: true,
      returnType: Object,
      eval: true,
      returnPath: '() => `upload/${ctx.state.auth.projectId}`',
      name: 'files',
      mimes: '() => `${ctx.state.config.ext}`',
      maxSize: '() => ctx.state.config.maxSize',
      uploadDir: '() => `assets/upload/${ctx.state.auth.projectId}`',
      maxCount: '() => ctx.state.config.maxFile'
      // resize: '() => ctx.state.config.resize'
    }
  ])
  @RESTRICT({
    query: {
      store: Boolean,
      name: String
    },
    params: {
      configId: Mongo.uuid
    },
    body: {
      files: async (vl, { state, query }) => {
        if (state.config.zip && (vl instanceof Array || !vl.originalname.endsWith('.zip'))) {
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
            const fileOut = path.parse(vl.path)
            await Utils.zip({
              path: vl.path,
              name: fileName.name
            }, path.join(fileOut.dir, `${fileOut.name}.zip`))
            await Utils.deleteUploadFiles(vl.path, state.config.resize)
            const httpPath = path.join(httpName.dir, `${httpName.name}.zip`)
            return `${httpPath}?name=${fileName.name}.zip`
          }
        } else if (state.config.resize && state.config.resize.length > 0) {
          const resize = state.config.resize
          const resizeImage = async (vl) => {
            path.resolve(vl.path)
            const fileName = path.parse(vl.originalname)
            const httpName = path.parse(vl.httpPath)
            const fileOut = path.resolve(vl.path)
            try {
              await Utils.executeCmd(`go run ${path.resolve('resize_image.go')} ` + `${JSON.stringify(JSON.stringify({ path: fileOut, sizes: resize }))}`)
            } catch (e) {
              await Utils.deleteUploadFiles(vl.path, state.config.resize)
              throw HttpError.INTERNAL('Could not resize image')
            }
            const httpPath = path.join(httpName.dir, `${httpName.name}${httpName.ext}`)
            return `${httpPath}?name=${fileName.name}${httpName.ext}`
          }
          if (!state.config.zip && resize && resize.length > 0) {
            if (vl instanceof Array) {
              if (vl.length > 0) await Promise.all(vl.map(resizeImage))
            } else {
              await resizeImage(vl)
            }
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
      await Promise.all(files.map(f => {
        const meta = f.split('?')
        body.files = meta[0]
        body.meta = meta[1]
        return FilesService.insert(body, state.config)
      }))
    } else {
      const meta = body.files.split('?')
      body.files = meta[0]
      body.meta = meta[1]
      await FilesService.insert(body, state.config)
    }
    return files
  }

  @PUT('/Store')
  @INJECT(authoriz(`${AppConfig.path}`, 'STORE'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      oldFiles: vl => vl instanceof Array ? vl.map(e => e.split('?')[0]) : [vl.split('?')[0]],
      files: vl => vl instanceof Array ? vl.map(e => e.split('?')[0]) : [vl.split('?')[0]]
    }
  })
  static async storeFiles({ state, body }) {
    if (!body.files) throw HttpError.BAD_REQUEST('files is required')
    await FilesService.store({
      _id: {
        files: {
          $in: body.files
        },
        account_id: state.auth.accountId,
        project_id: state.auth.projectId
      }
    })
    if (body.oldFiles) {
      await Promise.all(body.oldFiles.map(file => FilesService.delete({
        files: file,
        project_id: state.auth.projectId
      })))
    }
  }

  @PUT('/Remove')
  @INJECT(authoriz(`${AppConfig.path}`, 'DELETE'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      files: vl => vl instanceof Array ? vl.map(e => e.split('?')[0]) : [vl.split('?')[0]]
    }
  })
  static async delFiles({ state, body }) {
    if (!body.files) throw HttpError.BAD_REQUEST('files is required')
    await Promise.all(body.files.map(file => FilesService.delete({
      files: file,
      project_id: state.auth.projectId
    })))
  }

}
