import { DELETE, GET, POST, PUT, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { ObjectService } from '../service/ObjectService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** LogController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ObjectController {

  @GET('/Object/:table')
  @INJECT(authoriz(`${AppConfig.path}/Object`, 'FIND'))
  @RESTRICT({
    params: {
      table: String
    },
    query: {
      page: Number,
      recordsPerPage: Number,
      where: Object,
      sort: Object,
      fields: Object
    }
  })
  static async find({ query, state, params }) {
    let where: any = Mongo.autocast(query.where || {})
    let sort: any = query.sort || { updated_at: -1 }
    let fields: any = query.fields || {}

    const rs = await ObjectService.find(params.table, state.auth.projectId, {
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: sort,
      $fields: fields
    })
    return rs
  }

  @GET('/Object/:table/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Object`, 'GET'))
  @RESTRICT({
    params: {
      table: String,
      _id: Mongo.uuid
    }
  })
  static async get({ state, params }) {
    return await ObjectService.get(params.table, state.auth.projectId, params._id)
  }

  @POST('/Object/:table')
  @INJECT(authoriz(`${AppConfig.path}/Object`, 'INSERT'))
  @BODYPARSER()
  @RESTRICT({
    params: {
      table: String
    }
  })
  static async add({ body, state, params }) {
    if (body instanceof Array) body = body.map(Mongo.autocast)
    else body = Mongo.autocast(body)
    const rs = await ObjectService.insert(params.table, state.auth.projectId, body)
    return rs
  }

  @PUT('/Object/:table/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Object`, 'UPDATE'))
  @BODYPARSER()
  @RESTRICT({
    params: {
      table: String,
      _id: Mongo.uuid
    }
  })
  static async update({ body, state, params }) {
    body = Mongo.autocast(body)
    body._id = params._id
    await ObjectService.update(params.table, state.auth.projectId, body)
  }

  @DELETE('/Object/:table/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Object`, 'DELETE'))
  @RESTRICT({
    params: {
      _id: Mongo.uuid,
      table: String
    }
  })
  static async del({ params, state }) {
    await ObjectService.delete(params.table, state.auth.projectId, params._id)
  }

}
