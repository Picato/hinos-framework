import * as _ from 'lodash'
import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { Role, RoleService } from '../service/RoleService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** RoleController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class RoleController {

  @GET('/Role')
  @INJECT(authoriz(`${AppConfig.name}>Role`, ['FIND']))
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
    let fields: any = query.fields || {}

    _.merge(where, { project_id: state.auth.projectId })

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
  @INJECT(authoriz(`${AppConfig.name}>Role`, ['GET']))
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
  @INJECT(authoriz(`${AppConfig.name}>Role`, ['INSERT']))
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
  @INJECT(authoriz(`${AppConfig.name}>Role`, ['UPDATE']))
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
  @INJECT(authoriz(`${AppConfig.name}>Role`, ['DELETE']))
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
