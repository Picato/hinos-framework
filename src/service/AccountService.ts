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
  project_id: Uuid
  account_id: Uuid
  role_ids: Uuid[]
  native: boolean
  /* tslint:enable */

  // static castToCached(_e: Account) {
  //   return JSON.stringify(_.pick(_e, ['_id', 'project_id', 'account_id', 'role_ids', 'native']))
  // }
  // static castToObject(_e) {
  //   if (!_e) return _e
  //   return JSON.parse(_e) as AccountCached
  //   // e._id = Mongo.uuid(e._id)
  //   // e.project_id = Mongo.uuid(e.project_id)
  //   // e.account_id = Mongo.uuid(e.account_id)
  //   // e.role_ids = (e.role_ids as string[]).map(e => Mongo.uuid(e)) as Uuid[]
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
      $fields: { project_id: 1, _id: 1, role_ids: 1, secret_key: 1, native: 1 }
    })
    for (const cached of caches) {
      await AccountService.setCachedToken(cached.secret_key, {
        project_id: cached.project_id,
        account_id: cached._id,
        role_ids: cached.role_ids,
        native: cached.native
      } as AccountCached)
    }
    console.log(`Loaded ${caches.length} accounts into cached`)
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
    }, { role_ids: 1, secret_key: 1, native: 1 })
    const rs = await AccountService.mongo.update(Account, {
      _id: accountId,
      secret_key: secretKey
    })
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
    await AccountService.setCachedToken(acc.secret_key)
    await AccountService.setCachedToken(secretKey, {
      project_id: projectId,
      account_id: accountId,
      role_ids: acc.role_ids,
      native: acc.native
    } as AccountCached)
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
    await AccountService.setCachedToken(acc.secret_key)
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
    await AccountService.touchCachedToken(token, plugins.oauth.session_expired)
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
    await AccountService.setCachedToken(token)
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
      for (const tk of acc.token) {
        await AccountService.setCachedToken(tk)
      }
      acc.token = []
    } else {
      for (let i = acc.token.length - 1; i >= 0; i--) {
        if (!AccountService.getCachedToken(acc.token[i])) {
          acc.token.splice(i, 1)
        }
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
    await AccountService.setCachedToken(token, {
      account_id: acc._id,
      role_ids: acc.role_ids,
      project_id: acc.project_id,
      native: acc.native
    } as AccountCached)
    await AccountService.touchCachedToken(token, oauth.session_expired)
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
      if (old.secret_key) await AccountService.setCachedToken(old.secret_key)
      for (const tk of old.token) {
        await AccountService.setCachedToken(tk)
      }
    } else {
      // Reload scret key to cached when reactived
      if (old.status !== body.status && body.status === Account.Status.ACTIVED && old.secret_key) {
        await AccountService.setCachedToken(old.secret_key, {
          account_id: body._id,
          role_ids: body.role_ids,
          project_id: body.project_id,
          native: old.native
        } as AccountCached)
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
    for (const tk of old.token) {
      await AccountService.setCachedToken(tk)
    }
  }

  ///////////////////// Cached

  static async touchCachedToken(token: string, time: number) {
    await AccountService.redis.touch(`$tk:${token}`, time)
  }

  static async setCachedToken(token: string, cached?: AccountCached) {
    if (!cached) return await AccountService.redis.del(`$tk:${token}`)
    await AccountService.redis.set(`$tk:${token}`, cached)
  }

  static async getCachedToken(token: string) {
    return await AccountService.redis.get(`$tk:${token}`) as AccountCached
  }

  private static generateToken() {
    return md5(`${Math.round(Math.random() * 1000000)}${Mongo.uuid()}`)
  }

}
