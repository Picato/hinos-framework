import * as _ from 'lodash'
import { GET, POST, PUT, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { Dynamic, DynamicService } from '../service/DynamicService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ClientController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ClientController {

  @GET('/:table')
  @INJECT(authoriz(`${AppConfig.path}`, ['FIND']))
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

  @POST('/:table')
  @INJECT(authoriz(`${AppConfig.path}`, ['INSERT']))
  @BODYPARSER({
    params: {
      table: String
    }
  })
  static async add({ body, state, params }) {
    body = Mongo.autocast(body)
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await DynamicService.insert(params.table, body) as Dynamic
    delete rs.project_id
    delete rs.account_id
    return rs
  }

}
