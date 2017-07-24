import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { md5 } from 'hinos-common/Encrypt'
import { Mongo } from 'hinos-mongo'
import { Account, AccountService } from '../service/AccountService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** AccountController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class AccountController {

  @GET('/Account')
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  @INJECT(authoriz(`${AppConfig.name}>Account`, ['FIND']))
  static async find({ query, state }) {
    let where = {
      project_id: state.auth.projectId
    }
    const rs: Account[] = await AccountService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $fields: {
        token: 0, password: 0, project_id: 0
      }
    })
    return rs
  }

  @GET('/Account/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Account`, ['GET']))
  @MATCHER({
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
  @INJECT(authoriz(`${AppConfig.name}>Account`, ['INSERT']))
  @BODYPARSER()
  @MATCHER({
    body: {
      username: String,
      password: md5,
      status: Number,
      recover_by: String,
      role_ids: Array,
      more: Object,
      secret_key: String
    }
  })
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    const rs: Account = await AccountService.insert(body)
    return rs
  }

  @PUT('/Account/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Account`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
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
    await AccountService.update(body)
  }

  @DELETE('/Account/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Account`, ['DELETE']))
  @MATCHER({
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
