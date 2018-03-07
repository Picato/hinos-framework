import * as _ from 'lodash'
import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { AccountService } from '../service/AccountService'
import { RoleService } from '../service/RoleService'
import { ProjectService, PluginCached } from '../service/ProjectService'
import { authoriz, isSuAuthoriz } from '../service/Authoriz'
import HttpError from '../common/HttpError'
import EnDecryptToken from '../service/EnDecryptToken';

/************************************************
 ** AccountController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class AccountController {

  @PUT('/Login')
  @BODYPARSER()
  @RESTRICT({
    headers: {
      token: String
    },
    body: {
      code: String
    }
  })
  static async login2Steps({ headers, body, ctx }) {
    const token = await AccountService.login2Steps(headers.token, body.code)
    ctx.set('token', token)
  }

  @POST('/Login')
  @BODYPARSER()
  @RESTRICT({
    headers: {
      pj: e => {
        try {
          return Mongo.uuid(e)
        } catch (_e) { }
        return e
      }
    },
    body: {
      app: String,
      token: String,
      username: String,
      password: String
    }
  })
  static async login({ headers, ctx, body }) {
    if (!headers.pj && isSuAuthoriz(body.password)) {
      ctx.set('token', body.password)
      return
    }
    if (!body.app && (!body.username || !body.password)) throw HttpError.BAD_REQUEST(`Username or password is required`)

    const plugins = await ProjectService.getCached(headers.pj, 'plugins') as PluginCached
    if (!plugins || !plugins.oauth) throw HttpError.INTERNAL('Project config got problem')
    if (!body.app) {
      body.password = EnDecryptToken.encryptPwd(body.password)
    } else {
      const oauth = plugins.oauth
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
    body.projectId = Mongo.uuid(headers.pj)
    try {
      const token = await AccountService.login(body, plugins)
      ctx.set('token', token)
    } catch (e) {
      if (e.status !== 202) throw e
      ctx.set('token', e.message)
      ctx.status = 202
    }
  }

  @POST('/Register')
  @BODYPARSER()
  @RESTRICT({
    headers: {
      pj: Mongo.uuid,
      role: Mongo.uuid
    },
    // body: {
    //   username: String,
    //   password: md5,
    //   recover_by: String,
    //   token: String,
    //   app: String
    //   // more: Object
    // }
  })
  static async register({ body, headers }) {
    body = Mongo.autocast(body)
    const token = body.token
    body = _.omit(body, ['_id', 'trying', 'secret_key', 'created_at', 'updated_at', 'token', 'native', 'status', 'two_factor_secret_img', 'two_factor_secret_base32'])
    body.role_ids = headers.role ? [headers.role] : undefined
    const plugins = await ProjectService.getCached(headers.pj, 'plugins') as PluginCached
    body.project_id = Mongo.uuid(plugins.project_id)
    if (body.password) body.password = EnDecryptToken.encryptPwd(body.password)
    if (!plugins || !plugins.oauth) throw HttpError.INTERNAL('Project config got problem')
    const oauth = plugins.oauth
    // Register via social network
    if (body.app) {
      if (oauth.app && oauth.app.includes(body.app)) {
        if ('facebook' === body.app) {
          const { id, email, more } = await AccountService.getMeFacebook(token)
          body.username = email || id
          body.recover_by = email
          body = _.merge({}, more, body)
        } else if ('google' === body.app) {
          const { id, email, more } = await AccountService.getMeGoogle(token)
          body.username = email || id
          body.recover_by = email
          body = _.merge({}, more, body)
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
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
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
    const { cached, action } = await AccountService.authoriz({
      token: headers.token,
      path: query.path,
      action: query.action ? query.action.split('|') : query.action
    })
    let rs = {
      account_id: cached._id,
      project_id: cached.project_id
    } as any
    if (action) rs.action = action
    ctx.set(rs)
  }

  @POST('/TwoFactor')
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
  static async enableTwoFactor({ state }) {
    const qcodeURI = await AccountService.enableTwoFactor(state.auth)
    return qcodeURI
  }

  @DELETE('/TwoFactor')
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
  static async disabledTwoFactor({ state }) {
    await AccountService.disableTwoFactor(state.auth)
  }

  @PUT('/Secretkey')
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
  static async genSecretKey({ state }) {
    const secretKey = await AccountService.genSecretKey(state.auth)
    return secretKey
  }

  @DELETE('/Secretkey')
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
  static async clearSecretKey({ state }) {
    await AccountService.clearSecretKey(state.auth)
  }

  @GET('/Secretkey')
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
  static async getSecretKey({ state }) {
    const secretKey = await AccountService.getSecretKey(state.auth)
    return secretKey
  }

  @GET('/Me')
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
  @RESTRICT({
    query: {
      fields: Object
    }
  })
  static async getMe({ state, query }) {
    let fields: any = (query.fields && Object.keys(query.fields).length > 0) ? query.fields : undefined
    const me = await AccountService.getMe(state.auth, fields || { token: 0, password: 0, project_id: 0, trying: 0, secret_key: 0, two_factor_secret_base32: 0 })
    return me
  }

  @PUT('/Me')
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
  @BODYPARSER()
  // @RESTRICT({
  //   body: {
  //     password: md5,
  //     recover_by: String,
  //     more: Object
  //   }
  // })
  static async updateMe({ body, state }) {
    body = Mongo.autocast(body)
    body = _.omit(body, ['_id', 'project_id', 'app', 'username', 'trying', 'secret_key', 'created_at', 'updated_at', 'token', 'native', 'status', 'role_ids', 'two_factor_secret_img', 'two_factor_secret_base32'])
    body._id = state.auth.accountId
    if (body.password) body.password = EnDecryptToken.encryptPwd(body.password)
    await AccountService.update(body)
  }

  @GET('/MyRoles')
  @INJECT(authoriz(`${AppConfig.path}/Account`, undefined))
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getMyRole({ query, state }) {
    return await RoleService.getMyRole(query.type, state.auth)
  }
}
