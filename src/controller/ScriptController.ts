import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { ScriptService } from '../service/ScriptService'
import { authoriz } from '../service/Authoriz'
import HttpError from '../common/HttpError'

/************************************************
 ** ScriptController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ScriptController {

  @GET('/Download')
  @MATCHER({
    query: {
      name: e => e.split(',').map(e => e.trim().toLowerCase()),
      id: e => e.split(',').map(e => Mongo.uuid(e.trim()))
    }
  })
  static async download(ctx) {
    if (ctx.query.name && ctx.query.name.length > 0) {
      return await ScriptService.download({ _name: { $in: ctx.query.name } }, ctx)
    }
    if (ctx.query.id && ctx.query.id.length > 0) {
      return await ScriptService.download({ _id: { $in: ctx.query.id } }, ctx)
    }
    throw HttpError.NOT_FOUND()
  }

  @GET('/')
  @INJECT(authoriz(`${AppConfig.name}>Script`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number,
      tag: String
    }
  })
  static async find({ query, state }) {
    let where: any = {}
    if (query.tag) {
      where.$and = [
        {
          $or: [
            { project_id: state.auth.projectId },
            { is_private: false }
          ]
        },
        {
          $or: [
            { tag: { $in: [query.tag.toLowerCase()] } },
            { name: new RegExp(query.tag, 'i') }
          ]
        }
      ]
    } else {
      where.project_id = state.auth.projectId
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
      is_private: Boolean,
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
      is_private: Boolean,
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