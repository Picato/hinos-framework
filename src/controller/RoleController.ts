import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { Role, RoleService } from '../service/RoleService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** RoleController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class RoleController {

  @GET('/Role')
  @INJECT(authoriz(`${AppConfig.name}>Role`, ['FIND']))
  static async find({ query, state }) {
    let where = {
      project_id: state.auth.projectId
    }
    const rs: Role[] = await RoleService.find({
      $where: where,
      $page: +query.page,
      $recordsPerPage: +query.recordsPerPage
    })
    return rs
  }

  @GET('/Role/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Role`, ['GET']))
  @MATCHER({
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
  @MATCHER({
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
  @MATCHER({
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
  @MATCHER({
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
