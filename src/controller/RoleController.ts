import * as _ from 'lodash'
import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { Role, RoleService } from '../service/RoleService'
import { AccountService } from '../service/AccountService'
import { authoriz } from '../service/Authoriz'
import HttpError from '../common/HttpError'

/************************************************
 ** RoleController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class RoleController {

  @GET('/Role/Default')
  @INJECT(authoriz(`${AppConfig.path}/Role`, 'GET_DEFAULT'))
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getDefautRole({ query }) {
    if (!query.type) throw HttpError.NOT_FOUND
    return RoleService.COMMON_ROLE[query.type]
  }

  @GET('/Role')
  @INJECT(authoriz(`${AppConfig.path}/Role`, 'FIND'))
  @RESTRICT({
    query: {
      page: Number,
      recordsPerPage: Number,
      where: Object,
      sort: Object,
      fields: Object
    }
  })
  static async find({ query, state }) {
    let where: any = Mongo.autocast(query.where || {})
    let sort: any = query.sort || {}
    let fields: any = query.fields

    _.merge(fields, { project_id: 0 })
    _.merge(where, { project_id: state.auth.projectId })

    const me = await AccountService.getCachedToken(state.auth.token.split('?')[0])
    if (!me.native) where.native = { $exists: false }

    const rs: Role[] = await RoleService.find({
      $where: where,
      $page: query.page,
      $sort: sort,
      $fields: fields,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

  @GET('/Role/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Role`, 'GET'))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state }) {
    const rs: Role = await RoleService.get({
      _id: params._id,
      project_id: state.auth.projectId
    })
    return rs
  }

  @POST('/Role')
  @INJECT(authoriz(`${AppConfig.path}/Role`, 'INSERT'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      name: String,
      api: Array,
      web: Array,
      mob: Array
    }
  })
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs: Role = await RoleService.insert(body)
    return rs
  }

  @PUT('/Role/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Role`, 'UPDATE'))
  @BODYPARSER()
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    },
    body: {
      name: String,
      api: Array,
      web: Array,
      mob: Array
    }
  })
  static async update({ params, body, state }) {
    body._id = {
      _id: params._id,
      project_id: state.auth.projectId
    }
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    await RoleService.update(body)
  }

  @DELETE('/Role/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Role`, 'DELETE'))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await RoleService.delete({
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}
