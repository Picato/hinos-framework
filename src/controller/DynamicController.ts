import * as _ from 'lodash'
import { DELETE, GET, POST, PUT, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { DynamicService } from '../service/DynamicService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** LogController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class DynamicController {

  @GET('/Object/:table')
  @INJECT(authoriz(`${AppConfig.path}/Object`, 'FIND'))
  @RESTRICT({
    params: {
      table: String
    },
    query: {
      mine: Boolean,
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
    let fields: any = query.fields || { _id: 1, created_at: 1, updated_at: 1, account_id: 1 }

    _.merge(where, { project_id: state.auth.projectId })
    if (query.mine) where.account_id = state.auth.accountId

    const rs = await DynamicService.find(params.table, state.auth.projectId, {
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: sort,
      $fields: fields
    })
    return rs.map(e => {
      delete e.project_id
      return e
    })
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
    return await DynamicService.get(params.table, state.auth.projectId, params._id)
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
    body = Mongo.autocast(body)
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await DynamicService.insert(params.table, body)
    delete rs.project_id
    delete rs.account_id
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
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    delete body.created_at
    delete body.updated_at
    await DynamicService.update(params.table, body)
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
    await DynamicService.delete(params.table, {
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}
