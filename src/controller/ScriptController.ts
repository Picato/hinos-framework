import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { Script, ScriptService } from '../service/ScriptService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ScriptController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ScriptController {

  @GET('/Download')
  @MATCHER({
    query: {
      name: e => e.split(',').map(e => e.trim().toLowerCase())
    }
  })
  static async download(ctx) {
    let where: any = {}
    if (!ctx.query.name || ctx.query.name.length === 0) return
    return await ScriptService.download(ctx.query.name, ctx)
  }

  @GET('/')
  @INJECT(authoriz(`${AppConfig.name}>Script`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number,
      name: String,
      tag: String
    }
  })
  static async find({ query }) {
    let where: any = {}
    if (query.name) where.name = new RegExp(query.name, 'i')
    if (query.tag) {
      where.tag = {
        $in: [query.tag.toLowerCase()]
      }
    }
    const rs = await ScriptService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: { _name: 1 },
      $fields: { content: 0 }
    })
    return rs
  }

  @GET('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Script`, ['GET']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params }) {
    const rs = await ScriptService.get(params._id)
    return rs
  }

  @POST('/')
  @INJECT(authoriz(`${AppConfig.name}>Script`, ['INSERT']))
  @BODYPARSER()
  @MATCHER({
    body: {
      name: String,
      ext: String,
      content: String,
      tag: e => e.split(',').map(e => e.trim().toLowerCase())
    }
  })
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await ScriptService.insert(body)
    return rs
  }

  @PUT('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Script`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
    params: {
      _id: Mongo.uuid
    },
    body: {
      name: String,
      ext: String,
      content: String,
      tag: e => e.split(',').map(e => e.trim().toLowerCase())
    }
  })
  static async update({ params, body, state }) {
    body._id = params._id
    body.account_id = state.auth.accountId
    await ScriptService.update(body)
  }

  @DELETE('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Script`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params }) {
    await ScriptService.delete(params._id)
  }

}
