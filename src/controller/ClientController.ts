import * as _ from 'lodash'
import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { md5 } from 'hinos-common/Encrypt'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { AccountService } from '../service/AccountService'
import { RoleService } from '../service/RoleService'
import { ProjectService } from '../service/ProjectService'
import { authoriz } from '../service/Authoriz'
import HttpError from '../common/HttpError'

/************************************************
 ** AccountController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class AccountController {

  @POST('/Login')
  @BODYPARSER()
  @RESTRICT({
    headers: {
      pj: Mongo.uuid
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
    const plugins = await ProjectService.getCachedPlugins(body.projectId)
    if (!plugins || !plugins.oauth) throw HttpError.INTERNAL('Project config got problem')
    const oauth = plugins.oauth
    if (oauth.app && oauth.app.length > 0 && body.app) {
      // Login via social network
      if (oauth.app && oauth.app.includes(body.app)) {
        if ('facebook' === body.app) {
          const { id, email } = await AccountService.getMeFacebook(body.token)
          body.username = email || id
        } else if ('google' === body.app) {
          const { id, email } = await AccountService.getMeGoogle(body.token)
          body.username = email || id
        } else {
          throw HttpError.BAD_REQUEST(`This app not supported to login via social network ${body.app}`)
        }
      } else {
        throw HttpError.BAD_REQUEST(`This app not supported to login via social network ${body.app}`)
      }
    }
    const token = await AccountService.login(body, plugins)
    ctx.set('token', token)
  }

  @POST('/Register')
  @BODYPARSER()
  @RESTRICT({
    headers: {
      pj: Mongo.uuid,
      role: Mongo.uuid
    },
    body: {
      username: String,
      password: md5,
      recover_by: String,
      token: String,
      app: String,
      more: Object
    }
  })
  static async register({ body, headers }) {
    body.project_id = headers.pj
    body.role_ids = headers.role ? [headers.role] : undefined
    if (body.more) body.more = Mongo.autocast(body.more)
    const plugins = await ProjectService.getCachedPlugins(body.project_id)
    if (!plugins || !plugins.oauth) throw HttpError.INTERNAL('Project config got problem')
    const oauth = plugins.oauth
    // Register via social network
    if (body.app) {
      if (oauth.app && oauth.app.includes(body.app)) {
        if ('facebook' === body.app) {
          const { id, email, more } = await AccountService.getMeFacebook(body.token)
          body.username = email || id
          body.recover_by = email
          body.more = _.merge(more, body.more)
        } else if ('google' === body.app) {
          const { id, email, more } = await AccountService.getMeGoogle(body.token)
          body.username = email || id
          body.recover_by = email
          body.more = _.merge(more, body.more)
        } else {
          throw HttpError.BAD_REQUEST(`This app not supported to register via social network ${body.app}`)
        }
      } else {
        throw HttpError.BAD_REQUEST(`This app not supported to register via social network ${body.app}`)
      }
    }
    const acc = await AccountService.register(body, plugins as any)
    return acc
  }

  @GET('/Logout')
  @RESTRICT({
    headers: {
      token: vl => vl.split('?')[0]
    }
  })
  static async logout({ headers }) {
    await AccountService.logout(headers.token)
  }

  @HEAD('/Ping')
  @RESTRICT({
    headers: {
      token: vl => vl.split('?')[0]
    }
  })
  static async ping({ headers }) {
    await AccountService.ping(headers.token)
  }

  @HEAD('/Authoriz')
  @RESTRICT({
    headers: {
      token: vl => vl.split('?')[0]
    },
    query: {
      path: String,
      action: String
    }
  })
  static async authoriz({ headers, query, ctx }) {
    const ac = await AccountService.authoriz({
      token: headers.token,
      path: query.path,
      action: query.action
    })
    if (ac) ctx.set({ account_id: ac.account_id, project_id: ac.project_id })
  }

  @PUT('/Secretkey')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'GEN_SECRETKEY'))
  static async genSecretKey({ state }) {
    const secretKey = await AccountService.genSecretKey(state.auth)
    return secretKey
  }

  @DELETE('/Secretkey')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'REMOVE_SECRETKEY'))
  static async clearSecretKey({ state }) {
    await AccountService.clearSecretKey(state.auth)
  }

  @GET('/Secretkey')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'GET_SECRETKEY'))
  static async getSecretKey({ state }) {
    const secretKey = await AccountService.getSecretKey(state.auth)
    return secretKey
  }

  @GET('/Me')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'GET_ME'))
  static async getMe({ state }) {
    const me = await AccountService.getMe(state.auth)
    return me
  }

  @PUT('/Me')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'UPDATE_ME'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      password: md5,
      recover_by: String,
      more: Object
    }
  })
  static async updateMe({ body, state }) {
    body._id = state.auth.accountId
    if (body.more) body.more = Mongo.autocast(body.more)
    await AccountService.update(body)
  }

  @GET('/MyRoles')
  @INJECT(authoriz(`${AppConfig.path}/Account`, 'GET_MYROLES'))
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getMyRole({ query, state }) {
    return await RoleService.getMyRole(query.type, state.auth)
  }
}
