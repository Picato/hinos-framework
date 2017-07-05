import { Context } from 'hinos'
import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { md5, base64 } from 'hinos-common/Encrypt'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo, Uuid } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { Account, AccountService } from '../service/AccountService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** AccountController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class AccountController {

  @POST('/Login')
  @BODYPARSER()
  @MATCHER({
    headers: {
      pj: Uuid,
      app: String
    },
    body: {
      username: String,
      password: md5
    }
  })
  static async login({ headers, ctx, body }) {
    body.projectId = headers.pj
    body.app = headers.app
    const token = await AccountService.login(body)
    ctx.set('token', token)
  }

  @POST('/Register')
  @BODYPARSER()
  @MATCHER({
    headers: {
      pj: Uuid,
      role_id: vl => vl instanceof Array ? vl.map(Mongo.uuid) : [Mongo.uuid(vl)],
      app: String
    },
    body: {
      username: String,
      password: md5,
      recover_by: String,
      more: Object
    }
  })
  static async register({ body, headers }) {
    const acc = await AccountService.register(Object.assign(body, {
      app: headers.app,
      project_id: headers.pj,
      role_ids: headers.role_id
    }))
    return acc
  }

  @GET('/Logout')
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['LOGOUT']))
  static async logout({ state }) {
    await AccountService.logout(state.auth)
  }

  @HEAD('/Ping')
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['PING']))
  static async ping({ state }) {
    await AccountService.ping(state.auth)
  }

  @HEAD('/Authoriz')
  @MATCHER({
    headers: {
      token: vl => vl.split('?')[0]
    },
    query: {
      path: String,
      actions: vl => vl.split(',')
    }
  })
  @INJECT(async ({ headers, query, ctx }, next: Function) => {
    ctx.state.token = headers.token
    ctx.state.path = query.path
    ctx.state.actions = query.actions
    await next()
  })
  static async authoriz({ state, headers, ctx }) {
    const rs = await AccountService.authoriz(state)
    ctx.set({ token: headers.token })
  }

  @PUT('/Secretkey')
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['GEN_SECRETKEY']))
  static async genSecretKey({ state }) {
    const secretKey = await AccountService.genSecretKey(state.auth)
    return secretKey
  }

  @GET('/Secretkey')
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['GET_SECRETKEY']))
  static async getSecretKey({ state }) {
    const secretKey = await AccountService.getSecretKey(state.auth)
    return secretKey
  }

  @GET('/Me')
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['GET_INFOR']))
  static async getMe({ state }) {
    const me = await AccountService.getMe(state.auth)
    return me
  }

  @PUT('/Me')
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
    body: {
      password: md5,
      recover_by: String,
      more: Object
    }
  })
  static async updateMe({ body, state }) {
    body._id = state.auth.accountId
    await AccountService.update(body)
    const me = await AccountService.getMe(state)
    return me
  }

}