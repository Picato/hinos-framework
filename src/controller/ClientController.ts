import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { md5 } from 'hinos-common/Encrypt'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo, Uuid } from 'hinos-mongo'
import { AccountService } from '../service/AccountService'
import { RoleService } from '../service/RoleService'
import { authoriz } from '../service/Authoriz'
import HttpError from '../common/HttpError'

/************************************************
 ** AccountController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class AccountController {

  @POST('/Login')
  @BODYPARSER()
  @MATCHER({
    headers: {
      pj: Uuid
    },
    body: {
      app: String,
      token: String,
      username: String,
      password: md5
    }
  })
  static async login({ headers, ctx, body }) {
    body.projectId = headers.pj
    if ('facebook' === body.app) {
      const { id } = await AccountService.getMeFacebook(body.token)
      body.username = id
    }
    const token = await AccountService.login(body)
    ctx.set('token', token)
  }

  @POST('/Register')
  @BODYPARSER()
  @MATCHER({
    headers: {
      pj: Uuid,
      role_id: Mongo.uuid
    },
    body: {
      username: String,
      password: md5,
      recover_by: String,
      token: String,
      app: String,
      more: Mongo.autocast
    }
  })
  static async register({ body, headers }) {
    body.project_id = headers.pj
    body.role_ids = headers.role_id ? [headers.role_id] : undefined
    if ('facebook' === body.app) {
      const { id, email } = await AccountService.getMeFacebook(body.token)
      body.username = id
      body.recover_by = email
    }
    const acc = await AccountService.register(body)
    return acc
  }

  @GET('/Logout')
  @MATCHER({
    headers: {
      token: vl => vl.split('?')[0]
    }
  })
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['LOGOUT']))
  static async logout({ state }) {
    await AccountService.logout(state.auth)
  }

  @HEAD('/Ping')
  @MATCHER({
    headers: {
      token: vl => vl.split('?')[0]
    }
  })
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
      actions: vl => vl.split(',').map(e => e.trim())
    }
  })
  @INJECT(async ({ headers, query, ctx }, next: Function) => {
    ctx.state.token = headers.token
    ctx.state.path = query.path
    ctx.state.actions = query.actions
    await next()
  })
  static async authoriz({ state, ctx }) {
    const ac = await AccountService.authoriz(state)
    if (ac) ctx.set({ account_id: ac.account_id, project_id: ac.project_id })
  }

  @PUT('/Secretkey')
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['GEN_SECRETKEY']))
  static async genSecretKey({ state }) {
    const secretKey = await AccountService.genSecretKey(state.auth)
    return secretKey
  }

  @DELETE('/Secretkey')
  @INJECT(authoriz(`${AppConfig.name}>Me`, ['GEN_SECRETKEY']))
  static async clearSecretKey({ state }) {
    await AccountService.clearSecretKey(state.auth)
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
      more: Mongo.autocast
    }
  })
  static async updateMe({ body, state }) {
    body._id = state.auth.accountId
    await AccountService.update(body)
    const me = await AccountService.getMe(state)
    return me
  }

  @GET('/MyRoles')
  @INJECT(authoriz(`${AppConfig.name}>MyRole`, ['GET_ROLES']))
  @MATCHER({
    query: {
      type: String
    }
  })
  static async getMyRole({ query, state }) {
    if (!query.type) return HttpError.BAD_REQUEST('Type is required')
    const roles = await AccountService.getRoles(state.auth)
    if (!roles || roles.length === 0) throw HttpError.NOT_FOUND()
    const myroles = await RoleService.getMyRole(roles, state.auth)
    let list = []
    for (let r of myroles) {
      const rs = r[query.type]
      if (rs) list = list.concat(rs)
    }
    return list
  }
}
