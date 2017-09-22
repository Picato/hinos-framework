import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { ScriptService } from '../service/ScriptService'
import { authoriz } from '../service/Authoriz'
import HttpError from '../common/HttpError'

/************************************************
 ** ScriptController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ScriptController {

  @GET('/Download')
  @RESTRICT({
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
  @RESTRICT({
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
            { name: new RegExp(query.tag, 'i') },
            { tag: { $in: [query.tag.toLowerCase()] } }
          ]
        }
      ]
    } else {
      where.$or = [
        { project_id: state.auth.projectId },
        { is_private: false }
      ]
    }
    const rs = await ScriptService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: { is_private: -1, _name: 1 },
      $fields: { content: 0 }
    })
    return rs
  }

  @GET('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Script`, ['GET']))
  @RESTRICT({
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
  @RESTRICT({
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
  @RESTRICT({
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
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params }) {
    await ScriptService.delete(params._id)
  }

}
