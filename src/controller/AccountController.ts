import * as _ from 'lodash'
import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { md5 } from 'hinos-common/Encrypt'
import { Mongo } from 'hinos-mongo'
import { Account, AccountService } from '../service/AccountService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** AccountController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class AccountController {

  @GET('/Account')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'FIND'))
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
    let fields: any = query.fields || { token: 0, password: 0, project_id: 0, trying: 0, secret_key: 0 }

    _.merge(where, { project_id: state.auth.projectId })

    const rs = await AccountService.find(state.auth.token.split('?')[0], {
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: sort,
      $fields: fields
    })
    if (!query.fields) return rs
    return rs.map(e => {
      delete e.password
      delete e.token
      delete e.password
      delete e.project_id
      delete e.trying
      delete e.secret_key
      return e
    })
  }

  @GET('/Account/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'GET'))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state }) {
    const rs: Account = await AccountService.get({
      _id: params._id,
      project_id: state.auth.projectId
    })
    return rs
  }

  @POST('/Account')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'INSERT'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      username: String,
      password: md5,
      status: Number,
      recover_by: String,
      role_ids: Array,
      more: Object
    }
  })
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    if (body.more) body.more = Mongo.autocast(body.more)
    const rs: Account = await AccountService.insert(body)
    return rs
  }

  @PUT('/Account/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'UPDATE'))
  @BODYPARSER()
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    },
    body: {
      password: md5,
      status: Number,
      recover_by: String,
      role_ids: Array,
      more: Object
    }
  })
  static async update({ params, body, state }) {
    body._id = {
      _id: params._id,
      project_id: state.auth.projectId
    }
    if (body.more) body.more = Mongo.autocast(body.more)
    await AccountService.update(body)
  }

  @DELETE('/Account/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'DELETE'))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await AccountService.delete({
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}
