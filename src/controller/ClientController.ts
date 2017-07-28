import * as _ from 'lodash'
import { GET, POST, PUT, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { Log, LogService } from '../service/LogService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ClientController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ClientController {

  @GET('/')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number,
      where: Mongo.autocast,
      sort: Object,
      fields: Object
    }
  })
  static async find({ query, state }) {
    let where: any = query.where || {}
    let sort: any = query.sort || { updated_at: -1 }
    let fields: any = query.fields || {}

    _.merge(where, { project_id: state.auth.projectId })
    _.merge(fields, { project_id: 0 })

    const rs = await LogService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: sort,
      $fields: fields
    })
    return rs
  }

  @GET('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['GET']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state }) {
    const rs = await LogService.get({
      _id: params._id,
      project_id: state.auth.projectId
    })
    return rs
  }

  @POST('/')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['INSERT']))
  @BODYPARSER()
  static async add({ body, state }) {
    body = Mongo.autocast(body)
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await LogService.insert(body) as Log
    return rs
  }

  @PUT('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
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
    delete body.type
    delete body.project_id
    delete body.title
    // Just allow update status and customize fields
    await LogService.update(body)
  }

}
