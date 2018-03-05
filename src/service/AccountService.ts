import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { Redis, REDIS } from 'hinos-redis'
import md5 from 'hinos-common/encrypt/md5'
import HttpError from '../common/HttpError'
import { Role } from './RoleService'
import { ProjectService, Plugin, PluginCached } from './ProjectService'
import { RoleService } from './RoleService'
import axios from 'axios'
import * as speakeasy from 'speakeasy'
import * as qrcode from 'qrcode'

/************************************************
 ** AccountService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Account')
/* tslint:disable */
export class Account {
  _id?: Uuid
  app?: string
  username?: string
  password?: string
  project_id?: Uuid
  status?: number
  recover_by?: string
  role_ids?: Uuid[]
  trying?: number
  secret_key?: string
  created_at?: Date
  updated_at?: Date
  token?: string[]
  native?: boolean
  two_factor_secret_img?: string // login via google authenticator
  two_factor_secret_base32?: string // login via google authenticator
}
/* tslint:enable */

export class AccountCached {
  /* tslint:disable */
  _id: string
  project_id: string
  role_ids: string[]
  native: boolean
  is_secret: boolean
  /* tslint:enable */

  static castToCached(_e: Account, isSecret = false) {
    const r = _.pick(_e, ['project_id', '_id', 'role_ids', 'native']) as AccountCached
    r.is_secret = isSecret
    return r
  }
  // static castToObject(_e: string) {
  //   return (_e ? JSON.parse(_e) : _e) as AccountCached
  // }
}

export namespace Account {
  export const Status = {
    ACTIVED: 1,
    INACTIVED: 0,
    LOCKED: -1
  }
}

export class AccountService {
  @MONGO()
  private static mongo: Mongo

  @REDIS()
  private static redis: Redis

  static async loadIntoCached() {
    const caches = await AccountService.mongo.find<Account>(Account, {
      $where: {
        secret_key: { $exists: true }
      },
      $recordsPerPage: 0,
      $fields: { project_id: 1, _id: 1, role_ids: 1, secret_key: 1, native: 1 }
    })
    await Promise.all(caches.map(c => AccountService.redis.set(`$tk:${c.secret_key}`, AccountCached.castToCached(c, true))))
  }

  static async getMeFacebook(token: string): Promise<{ id: string, email: string, more: any }> {
    try {
      const { data } = await axios.get(`https://graph.facebook.com/v2.10/me?access_token=${token}&fields=email%2Cname&format=json&method=get&pretty=0&suppress_http_code=1`)
      return {
        id: data.id,
        email: data.email,
        more: {
          fullname: data.name,
          avatar: `http//graph.facebook.com/${data.id}/picture`
        }
      }
    } catch (e) {
      if (e.response) throw HttpError.CUSTOMIZE(e.response.status, e.response.data)
      throw e
    }
  }

  static async getMeGoogle(token: string): Promise<{ id: string, email: string, more: any }> {
    try {
      const { data } = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${token}`)
      return {
        id: data.id,
        email: data.email,
        more: {
          fullname: data.name,
          locale: data.locale,
          avatar: data.picture
        }
      }
    } catch (e) {
      if (e.response) throw HttpError.CUSTOMIZE(e.response.status, e.response.data)
      throw e
    }
  }

  static async enableTwoFactor({ accountId = undefined as Uuid, projectId = undefined as Uuid }) {
    const project = await ProjectService.get(projectId, { name: 1 })
    const me = await AccountService.mongo.get<Account>(Account, accountId, { username: 1 })
    const secret = speakeasy.generateSecret({
      name: `/${project.name}/${me.username}`
    })
    return new Promise((resolve, reject) => {
      qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) return reject(err)
        AccountService.mongo.update(Account, {
          _id: {
            _id: accountId,
            project_id: projectId
          },
          two_factor_secret_base32: secret.base32,
          two_factor_secret_img: data_url
        }).then((rs) => {
          if (rs === 0) return reject(HttpError.INTERNAL('Not found this user'))
          resolve(data_url)
        }).catch(reject)
      });
    })
  }

  static async disableTwoFactor({ accountId = undefined as Uuid, projectId = undefined as Uuid }) {
    const rs = await AccountService.mongo.update(Account, {
      _id: {
        _id: accountId,
        project_id: projectId
      },
      two_factor_secret_img: undefined,
      two_factor_secret_base32: undefined
    })
    if (rs === 0) throw HttpError.INTERNAL('Could not disable')
  }

  static async getSecretKey({ accountId = undefined as Uuid }) {
    const acc = await AccountService.mongo.get<Account>(Account, accountId, {
      secret_key: 1
    })
    return acc.secret_key
  }

  static async getAdminNativeSecretKey(projectId: Uuid) {
    const acc = await AccountService.mongo.get<Account>(Account, {
      project_id: projectId,
      native: true
    }, {
        secret_key: 1
      })
    return acc.secret_key
  }

  static async genSecretKey({ accountId = undefined as Uuid, projectId = undefined as Uuid }) {
    const secretKey = AccountService.generateToken()
    const acc = await AccountService.mongo.get<Account>(Account, {
      _id: accountId,
      project_id: projectId
    }, { role_ids: 1, secret_key: 1, native: 1, project_id: 1, _id: 1 })
    const rs = await AccountService.mongo.update(Account, {
      _id: accountId,
      secret_key: secretKey
    })
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
    if (acc.secret_key) await AccountService.redis.del(`$tk:${acc.secret_key}`)
    await AccountService.redis.set(`$tk:${secretKey}`, AccountCached.castToCached(acc, true))
    return secretKey
  }

  static async clearSecretKey({ accountId = undefined as Uuid, projectId = undefined as Uuid }) {
    const acc = await AccountService.mongo.get<Account>(Account, {
      _id: accountId,
      project_id: projectId
    }, { secret_key: 1 })
    const rs = await AccountService.mongo.update(Account, {
      _id: acc._id,
      secret_key: undefined
    })
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
    if (acc.secret_key) await AccountService.redis.del(`$tk:${acc.secret_key}`)
  }

  static async getMe({ accountId }, fields?: any) {
    const me = await AccountService.mongo.get<Account>(Account, accountId, fields)
    return me
  }

  static async getRoles({ accountId }) {
    const me = await AccountService.mongo.get<Account>(Account, accountId, { role_ids: 1 })
    return me.role_ids
  }

  static async ping(token: string) {
    if (!token) throw HttpError.AUTHEN()
    const accountCached = await AccountService.getCachedToken(token)
    if (!accountCached) throw HttpError.EXPIRED()
    if (!accountCached.is_secret) {
      const plugins = await ProjectService.getCached(accountCached.project_id, 'plugins') as PluginCached
      if (!plugins) throw HttpError.INTERNAL('Could not found plugin configuration')
      await AccountService.redis.touch(`$tk:${token}`, plugins.oauth.session_expired)
    }
  }

  @VALIDATE(async (body: Account, { oauth }) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'username', String)
    Checker.option(body, 'app', String, () => Checker.required(body, 'token', String), () => Checker.required(body, 'password', String))
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'recover_by', String)
    Checker.required(body, 'role_ids', Array)
    body.created_at = new Date()
    body.updated_at = new Date()

    body.status = !oauth.mail_verify_template ? Account.Status.ACTIVED : Account.Status.INACTIVED

  })
  static async register(body, { oauth }) {
    const acc = await AccountService.insert(body, oauth)
    return _.omit(acc, ['role_ids', 'project_id', 'trying', 'token', 'secret_key', 'password', 'two_factor_secret_img', 'two_factor_secret_base32'])
  }

  static async authoriz({ token = undefined as string, path = undefined as string, action = undefined as string[] }) {
    if (!token) throw HttpError.AUTHEN()

    const cached = await AccountService.getCachedToken(token)
    if (!cached) throw HttpError.EXPIRED()

    const { roles } = await RoleService.getCachedApiRole(cached.project_id)
    const accRole = roles.filter(e => cached.role_ids.includes(e.role_id))
    for (const r of accRole) {
      if ((!r.isPathRegex && r.path === path) || (r.isPathRegex && new RegExp(`^${r.path}$`).test(path))) {
        if (!action) return { cached }
        if (r.isActionRegex) {
          const a = action.filter(a => new RegExp(`^${r.actions}$`).test(a))
          if (a.length > 0) {
            return { cached, action: action.length > 1 ? a.join('&') : undefined }
          }
        } else {
          const a = action.filter(a => a === r.actions)
          if (a.length > 0) {
            return { cached, action: action.length > 1 ? a.join('&') : undefined }
          }
        }
      }
    }
    throw HttpError.AUTHORIZ('Not allow access')
  }

  static async logout(token) {
    if (!token) throw HttpError.AUTHEN()
    await AccountService.redis.del(`$tk:${token}`)
  }

  static async login2Steps(tempToken: string, code: string) {
    const temp = await AccountService.redis.get(`$tk2steps:${tempToken}`) as string
    if (!temp) throw HttpError.NOT_FOUND("Could not found this token")
    const tempAcc = JSON.parse(temp) as {
      two_factor_secret_base32: string,
      pj: string,
      _id: string
    }
    const verified = speakeasy.totp.verify({
      secret: tempAcc.two_factor_secret_base32,
      encoding: 'base32',
      token: code
    })
    if (!verified) throw HttpError.BAD_REQUEST("Code verification is not valid")
    const plugins = await ProjectService.getCached(tempAcc.pj, 'plugins') as PluginCached
    const acc = await AccountService.mongo.get<Account>(Account, Mongo.uuid(tempAcc._id), { password: 1, app: 1, token: 1, status: 1, _id: 1, project_id: 1, role_ids: 1, trying: 1, native: 1, two_factor_secret_img: 1, two_factor_secret_base32: 1 })
    return await AccountService.loginPassed(acc, plugins)
  }

  static async login(user: { username: string, password: string, projectId: Uuid, app?: string }, { oauth }: Plugin) {
    const acc = await AccountService.mongo.get<Account>(Account, {
      username: new RegExp(`^${user.username}$`, 'i'),
      project_id: user.projectId
    }, { password: 1, app: 1, token: 1, status: 1, _id: 1, project_id: 1, role_ids: 1, trying: 1, native: 1, two_factor_secret_base32: 1 })
    if (!acc) throw HttpError.NOT_FOUND(`Could not found username ${user.username}`)
    if (acc.status === Account.Status.LOCKED) throw HttpError.BAD_REQUEST('Account was locked')
    if (acc.status !== Account.Status.ACTIVED) throw HttpError.BAD_REQUEST('Account not actived')
    const wrongPass = async (...msgs) => {
      if (oauth.trying) {
        if (acc.trying === undefined) acc.trying = 0
        if (acc.trying < oauth.trying - 1) {
          acc.trying++
          msgs.push(`You remain ${oauth.trying - acc.trying} times to retry`)
        } else {
          acc.trying = 0
          acc.status = Account.Status.LOCKED
          msgs.push(`Your account was locked`)
        }
        acc.updated_at = new Date()
        await AccountService.mongo.update(Account, acc)
      }
      throw HttpError.BAD_REQUEST(msgs.join('\n'))
    }
    if (user.app) {
      await Checker.required(user, 'app', String)
      if (!acc.app || acc.app !== user.app) {
        await wrongPass('Login via social error')
      }
    } else {
      await Checker.required(user, 'password', String)
      if (acc.password !== user.password) {
        await wrongPass('Password not match')
      }
    }
    if (acc.two_factor_secret_base32) {
      const tempToken = `${Mongo.uuid()}`
      await AccountService.redis.set(`$tk2steps:${tempToken}`, JSON.stringify({
        two_factor_secret_base32: acc.two_factor_secret_base32,
        pj: acc.project_id,
        _id: acc._id
      }), AppConfig.app.twoStepVerificationTimeout / 1000)
      throw HttpError.ACCEPTED(tempToken)
    }
    return await AccountService.loginPassed(acc, { oauth })
  }

  static async loginPassed(acc: Account, { oauth }: Plugin) {
    if (oauth.single_mode === true) {
      if (acc.token && acc.token.length > 0) await Promise.all(acc.token.map(tk => AccountService.redis.del(`$tk:${tk}`)))
      acc.token = []
    } else if (acc.token && acc.token.length > 0) {
      let cached
      for (let i = acc.token.length - 1; i >= 0; i--) {
        cached = await AccountService.getCachedToken(acc.token[i])
        if (!cached) acc.token.splice(i, 1)
      }
    }
    const token = AccountService.generateToken()
    acc.token.push(token)
    await AccountService.mongo.update(Account, {
      _id: acc._id,
      token: acc.token,
      trying: 0,
      updated_at: new Date()
    })
    await AccountService.redis.set(`$tk:${token}`, AccountCached.castToCached(acc), oauth.session_expired)
    return `${token}?${oauth.session_expired}`
  }

  static async createDefaultAdminAccount(projectId: Uuid, role: Role) {
    // Create default account
    const password = Mongo.uuid().toString().split('').reverse().join('').substr(0, 6)
    const admin = await AccountService.insert({
      username: 'admin',
      password: md5(password),
      project_id: projectId,
      recover_by: 'YourEmail@gmail',
      status: Account.Status.ACTIVED,
      role_ids: [role._id],
      native: true
    })
    // Update owner after create account
    await ProjectService.update({
      _id: projectId,
      owner: `${admin.username}/${password}`
    })
  }

  static async find(fil: any = {}) {
    const rs = await AccountService.mongo.find<Account>(Account, fil)
    return rs
  }

  static async get(_id: any, fields: any) {
    const rs = await AccountService.mongo.get<Account>(Account, _id, fields)
    return rs
  }

  @VALIDATE((body: Account) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'username', String)
    Checker.option(body, 'app', String, () => Checker.required(body, 'token', String), () => Checker.required(body, 'password', String))
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'status', Number)
    Checker.required(body, 'recover_by', String)
    Checker.option(body, 'role_ids', Array, () => {
      body.role_ids = Mongo.uuid(body.role_ids)
    }, () => {
      body.role_ids = []
    })
    body.trying = 0
    body.token = []
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Account, oauth?: any) {
    const existed = await AccountService.mongo.get(Account, {
      username: new RegExp(`^${body.username}$`, 'i'),
      project_id: body.project_id
    })
    // Check username must be not existed
    if (existed) throw HttpError.BAD_REQUEST(`Username ${body.username} was existed`)

    if (oauth && oauth.mail_verify_template) {
      const nativeToken = await AccountService.getAdminNativeSecretKey(body.project_id)
      const sendMail = () => {
        return new Promise((resolve, reject) => {
          axios.put(`${AppConfig.services.mail}/mail/Send/${oauth.mail_verify_template}`, {
            "to": [body.recover_by],
            "_this": body
          }, {
              headers: { token: nativeToken }
            }
          ).then(resolve).catch(err => {
            reject(err.response ? HttpError.CUSTOMIZE(err.response.status, err.response.data) : err)
          })
        })
      }
      await sendMail()
    }

    const rs = await AccountService.mongo.insert<Account>(Account, body) as Account
    return _.omit(rs, ['trying', 'token', 'project_id', 'role_ids', 'two_factor_secret_base32'])
  }

  @VALIDATE((body: Account) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'password', String)
    Checker.option(body, 'status', Number, () => {
      if (body.status === Account.Status.INACTIVED) body.token = []
    })
    Checker.option(body, 'recover_by', String)
    Checker.option(body, 'role_ids', Array, () => {
      body.role_ids = Mongo.uuid(body.role_ids)
    })
    body.updated_at = new Date()
  })
  static async update(body: Account) {
    const old = await AccountService.mongo.update<Account>(Account, body, {
      return: true
    }) as Account
    if (!old) throw HttpError.NOT_FOUND('Could not found item to update')
    // Check if password was updated
    if (body.native && body.password && old.password !== body.password) {
      await ProjectService.update({
        _id: old.project_id,
        owner: `${old.username}/******`
      })
    }
    // Clear cached if user is inactived
    if (old.status !== body.status && body.status === Account.Status.INACTIVED) {
      await Promise.all([old.secret_key, ...(old.token || [])].filter(e => e).map(tk => AccountService.redis.del(`$tk:${tk}`)))
    } else {
      // Reload scret key to cached when reactived
      if (old.status !== body.status && body.status === Account.Status.ACTIVED && old.secret_key) {
        AccountService.redis.set(`$tk:${old.secret_key}`, AccountCached.castToCached(Object.assign({}, old, body), true))
      }
    }
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [undefined, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const old = await AccountService.mongo.delete<Account>(Account, _id, {
      return: true
    }) as Account
    if (!old) throw HttpError.NOT_FOUND('Could not found account to delete')
    // Remove cached
    if (old.token && old.token.length > 0) await Promise.all(old.token.map(tk => AccountService.redis.del(`$tk:${tk}`)))
  }

  ///////////////////// Cached

  static async getCachedToken(token: string) {
    return await AccountService.redis.get(`$tk:${token}`) as AccountCached
  }

  private static generateToken() {
    return md5(`${Math.round(Math.random() * 1000000)}${Mongo.uuid()}`)
  }

}
