import * as _ from 'lodash'
import { GET, POST, PUT, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { Log, LogService } from '../service/LogService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ClientController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ClientController {

  @GET('/')
  @INJECT(authoriz(`${AppConfig.path}`, 'FIND'))
  @RESTRICT({
    query: {
      mine: Boolean,
      page: Number,
      recordsPerPage: Number,
      where: Object,
      sort: Object,
      fields: Object
    }
  })
  static async find({ query, state }) {
    let where: any = Mongo.autocast(query.where || {})
    let distinct: any = query.distinct
    let sort: any = query.sort || { updated_at: -1 }
    let fields: any = query.fields || {}

    _.merge(where, { project_id: state.auth.projectId })
    if (query.mine) where.account_id = state.auth.accountId

    const rs = await LogService.find({
      $distinct: distinct,
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

  @GET('/:_id')
  @INJECT(authoriz(`${AppConfig.path}`, 'GET'))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state }) {
    const rs = await LogService.get({
      _id: params._id,
      project_id: state.auth.projectId
    })
    if (rs) delete rs.project_id
    return rs
  }

  @POST('/')
  @INJECT(authoriz(`${AppConfig.path}`, 'INSERT'))
  @BODYPARSER()
  static async add({ body, state }) {
    body = Mongo.autocast(body)
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await LogService.insert(body) as Log
    delete rs.project_id
    delete rs.account_id
    return rs
  }

  @PUT('/:_id')
  @INJECT(authoriz(`${AppConfig.path}`, 'UPDATE'))
  @BODYPARSER()
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async update({ params, body, state }) {
    body = Mongo.autocast(body)
    body._id = {
      _id: params._id,
      project_id: state.auth.projectId
    }
    body.account_id = state.auth.accountId
    delete body.created_at
    delete body.updated_at
    delete body.project_id
    await LogService.update(body)
  }

}
