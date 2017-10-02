import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import * as archiver from 'archiver'

/************************************************
 ** ScriptService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Script')
/* tslint:disable */
export class Script {
  _id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  name?: string
  _name?: string
  ext?: string
  content?: string
  tag?: string[]
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export class ScriptService {
  @MONGO()
  private static mongo: Mongo

  static async download(where: { [key: string]: any }, ctx) {
    if (where._name) {
      where.$or = [{ is_private: false }]
    }
    const rs = await ScriptService.mongo.find<Script>(Script, {
      $where: where
    })
    if (rs.length === 0) throw HttpError.NOT_FOUND()
    ctx.status = 200
    if (rs.length > 1) {
      ctx.res.manual = true
      const archive = archiver('zip', {
        store: true
      })
      archive.pipe(ctx.res)
      for (let r of rs) {
        archive.append(r.content, { name: r.name + '.' + r.ext })
      }
      archive.finalize()
      ctx.set('Content-Type', 'application/zip')
      ctx.set('Content-Disposition', `attachment; filename=cmd.zip`)
    } else {
      ctx.set('Content-Disposition', `attachment; filename=${rs[0].name}.${rs[0].ext}`)
      return new Buffer(rs[0].content, 'utf8')
    }
    return undefined
  }

  static async find(fil = {}) {
    const rs = await ScriptService.mongo.find<Script>(Script, fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await ScriptService.mongo.get<Script>(Script, _id)
    return rs
  }

  static async replaceContent(content: string, projectId: Uuid) {
    const key: any = {}
    for (const c of content.split('\n')) {
      if (/^@[^\r|\n]+$/.test(c)) {
        const k = c.substr(1).trim()
        key[k] = `#!${k}\r\n`
      }
    }
    const rs = await ScriptService.mongo.find<Script>(Script, {
      $where: {
        _name: {
          $in: Object.keys(key).map(e => e.toLowerCase())
        },
        $or: [{ is_private: false }, { project_id: projectId }]
      }
    })
    for (let r of rs) {
      key[r.name] = `#${r.name}\r\n${r.content}\r\n`
    }
    for (let k in key) {
      content = content.replace(new RegExp(`^@${k}$`, 'm'), key[k])
    }
    return content
  }

  @VALIDATE(async (body: Script) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'name', String)
    const existed = await ScriptService.mongo.get<Script>(Script, {
      _name: body.name.toLowerCase()
    })
    if (existed) throw HttpError.BAD_REQUEST(`Existed script name "${body.name}"`)
    body._name = body.name.toLowerCase()
    Checker.required(body, 'content', String)
    Checker.option(body, 'des', String)
    Checker.required(body, 'ext', String)
    Checker.option(body, 'tag', Array)
    Checker.option(body, 'is_private', Boolean, false)
    body.content = await ScriptService.replaceContent(body.content, body.project_id)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Script) {
    const rs = await ScriptService.mongo.insert<Script>(Script, body)
    return rs
  }

  @VALIDATE(async (body: Script) => {
    Checker.required(body, '_id', Object)
    Checker.required(body._id, '_id', Uuid)
    Checker.required(body._id, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.option(body, 'content', String)
    Checker.option(body, 'des', String)
    await Checker.option(body, 'name', String, async () => {
      body._name = body.name.toLowerCase()
    })
    Checker.option(body, 'tag', Array)
    Checker.option(body, 'ext', String)
    Checker.option(body, 'is_private', Boolean)
    body.content = await ScriptService.replaceContent(body.content, body.project_id)
    body.updated_at = new Date()
  })
  static async update(body: Script) {
    const old = await ScriptService.mongo.get<Script>(Script, body._id, { _name: 1 })
    if (old._name !== body._name) {
      const existed = await ScriptService.mongo.get<Script>(Script, {
        _id: {
          $ne: old._id
        },
        _name: body._name
      })
      if (existed) throw HttpError.BAD_REQUEST(`Existed script name "${body.name}"`)
    }
    const rs = await ScriptService.mongo.update(Script, body)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((where: any) => {
    Checker.required(where, '_id', Object)
    Checker.required(where._id, '_id', Uuid)
    Checker.required(where._id, 'project_id', Uuid)
  })
  static async delete(where: any) {
    const rs = await ScriptService.mongo.delete(Script, where)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }
}
