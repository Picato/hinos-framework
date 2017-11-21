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
}
/* tslint:enable */

export class AccountCached {
  /* tslint:disable */
  _id: string
  project_id: string
  role_ids: string[]
  native: boolean
  /* tslint:enable */

  static castToCached(_e: Account) {
    return JSON.stringify(_.pick(_e, ['project_id', '_id', 'role_ids', 'native']))
  }
  static castToObject(_e: string) {
    return (_e ? JSON.parse(_e) : _e) as AccountCached
  }
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
      $fields: { project_id: 1, _id: 1, role_ids: 1, secret_key: 1, native: 1 }
    })
    await Promise.all(caches.map(c => AccountService.redis.set(`$tk:${c.secret_key}`, AccountCached.castToCached(c))))
  }

  static async getMeFacebook(token: string): Promise<{ id: string, email: string, more: any }> {
    const { data } = await axios.get(`https://graph.facebook.com/v2.10/me?access_token=${token}&fields=email%2Cname&format=json&method=get&pretty=0&suppress_http_code=1`)
    return {
      id: data.id,
      email: data.email,
      more: {
        fullname: data.name,
        avatar: `http//graph.facebook.com/${data.id}/picture`
      }
    }
  }

  static async getMeGoogle(token: string): Promise<{ id: string, email: string, more: any }> {
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
    await AccountService.redis.set(`$tk:${secretKey}`, AccountCached.castToCached(acc))
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
    const plugins = await ProjectService.getCached(accountCached.project_id, 'plugins') as PluginCached
    if (!plugins) throw HttpError.INTERNAL('Could not found plugin configuration')
    await AccountService.redis.touch(`$tk:${token}`, plugins.oauth.session_expired)
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
    return _.omit(acc, ['role_ids', 'project_id', 'trying', 'token', 'secret_key', 'password'])
  }

  static async authoriz({ token = undefined as string, path = undefined as string, action = undefined as string }) {
    if (!token) throw HttpError.AUTHEN()

    const cached = await AccountService.getCachedToken(token)
    if (!cached) throw HttpError.EXPIRED()

    const { roles } = await RoleService.getCachedApiRole(cached.project_id)
    const accRole = roles.filter(e => cached.role_ids.includes(e.role_id))
    for (const r of accRole) {
      if ((!r.isPathRegex && r.path === path) || (r.isPathRegex && new RegExp(`^${r.path}$`).test(path))) {
        if (r.isActionRegex && new RegExp(`^${r.actions}$`).test(action)) return cached
        else if (r.actions === action) return cached
      }
    }
    throw HttpError.AUTHORIZ('Not allow access')
  }

  static async logout(token) {
    if (!token) throw HttpError.AUTHEN()
    await AccountService.redis.del(`$tk:${token}`)
  }

  static async login(user: { username: string, password: string, projectId: Uuid, app?: string }, { oauth }: Plugin) {
    const acc = await AccountService.mongo.get<Account>(Account, {
      username: new RegExp(`^${user.username}$`, 'i'),
      project_id: user.projectId
    }, { password: 1, app: 1, token: 1, status: 1, _id: 1, project_id: 1, role_ids: 1, trying: 1, native: 1 })
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
    await Checker.option(user, 'password', String, async () => {
      if (acc.password !== user.password) {
        await wrongPass('Password not match')
      }
    }, async () => {
      await Checker.option(user, 'app', String, async () => {
        if (!acc.app || !acc.app.includes(user.app)) {
          await wrongPass('Login via social error')
        }
      }, async () => {
        await wrongPass('Password not match')
      })
    })
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

  static async get(_id: any) {
    const rs = await AccountService.mongo.get<Account>(Account, _id, { token: 0, password: 0, project_id: 0, trying: 0, secret_key: 0 })
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
    return _.omit(rs, ['trying', 'token', 'project_id', 'role_ids'])
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
    })
    if (!old) throw HttpError.NOT_FOUND('Could not found item to update')
    // Check if password was updated
    if (body.password && old.password !== body.password) {
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
        AccountService.redis.set(`$tk:${old.secret_key}`, AccountCached.castToCached(Object.assign({}, old, body)))
      }
    }
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [undefined, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const old = await AccountService.mongo.delete<Account>(Account, _id, {
      return: true
    })
    if (!old) throw HttpError.NOT_FOUND('Could not found account to delete')
    // Remove cached
    if (old.token && old.token.length > 0) await Promise.all(old.token.map(tk => AccountService.redis.del(`$tk:${tk}`)))
  }

  ///////////////////// Cached

  static async getCachedToken(token: string) {
    const rs = await AccountService.redis.get(`$tk:${token}`)
    return (rs ? AccountCached.castToObject(rs as string) : rs) as AccountCached
  }

  private static generateToken() {
    return md5(`${Math.round(Math.random() * 1000000)}${Mongo.uuid()}`)
  }

}
