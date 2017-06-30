import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { Redis, REDIS } from 'hinos-redis'
import { md5 } from 'hinos-common/Encrypt'
import HttpError from '../common/HttpError'
import { Role, Action } from './RoleService'
import { ProjectService } from './ProjectService'
import { RoleService } from './RoleService'

/************************************************
 ** AccountService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Account')
export class Account {
  _id?: Uuid
  app?: string
  username?: string
  password?: string
  project_id?: Uuid
  status?: number
  recover_by?: string
  role_ids?: Array<Uuid>
  more?: object
  secret_key?: string
  created_at?: Date
  updated_at?: Date
  token?: string[]
  native?: boolean
}

export class AccountCached {
  project_id: Uuid
  account_id: Uuid
  role_ids: Uuid[]

  static cast(_this) {
    return <AccountCached>{
      project_id: Mongo.uuid(_this.project_id),
      role_ids: _this.role_ids.map(Mongo.uuid),
      account_id: Mongo.uuid(_this.account_id)
    }
  }
}

export namespace Account {
  export const Status = {
    ACTIVED: 1,
    INACTIVED: 0
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
      $fields: { project_id: 1, _id: 1, role_ids: 1, secret_key: 1 }
    })
    let count = 0
    for (const cached of caches) {
      await AccountService.setCachedToken(cached.secret_key, <AccountCached>{
        project_id: cached.project_id,
        account_id: cached._id,
        role_ids: cached.role_ids
      })
    }
    console.log(`Loaded ${caches.length} accounts into cached`)
  }

  static async getSecretKey({ accountId }) {
    const acc = await AccountService.mongo.get<Account>(Account, accountId, {
      secret_key: 1
    })
    return acc.secret_key
  }

  static async genSecretKey({ accountId, projectId }) {
    const secretKey = `${projectId}${accountId}${Mongo.uuid().toString()}`
    const acc = await AccountService.mongo.get<Account>(Account, accountId, {
      project_id: 1, role_ids: 1, secret_key: 1
    })
    const rs = <number>await AccountService.mongo.update<Account>(Account, {
      _id: accountId,
      secret_key: secretKey
    })
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
    await AccountService.setCachedToken(acc.secret_key)
    await AccountService.setCachedToken(secretKey, <AccountCached>{
      project_id: acc.project_id,
      account_id: acc._id,
      role_ids: acc.role_ids
    })
    return secretKey
  }

  static async getMe({ projectId, accountId }) {
    const me = await AccountService.mongo.get<Account>(Account, accountId, { username: 1, recover_by: 1, more: 1, created_at: 1, updated_at: 1 })
    return me
  }

  static async ping({ token = <string>undefined, projectId = <Uuid>undefined }) {
    const plugins = await ProjectService.getCachedPlugins(projectId)
    await AccountService.touchCachedToken(token, plugins.oauth.session_expired)
  }

  @VALIDATE(async (body: Account) => {
    body._id = <Uuid>Mongo.uuid()
    Checker.required(body, 'username', String)
    Checker.required(body, 'password', String)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'recover_by', String)
    Checker.required(body, 'role_ids', Array)
    Checker.option(body, 'more', Object, {})
    body.created_at = new Date()
    body.updated_at = new Date()

    const plugins = await ProjectService.getCachedPlugins(body.project_id)
    if (!plugins || !plugins.oauth) throw HttpError.INTERNAL('oauth plugin not config yet')
    const oauth = plugins.oauth

    body.status = !oauth.is_verify ? Account.Status.ACTIVED : Account.Status.INACTIVED

  })
  static async register(body) {
    const acc = await AccountService.insert(body)
    return acc
  }

  static async authen(token) {
    let cached = <AccountCached>await AccountService.getCachedToken(token)
    if (!cached) throw HttpError.AUTHEN()
    return AccountCached.cast(cached)
  }

  static async authoriz({ token = <string>undefined, path = <string>undefined, actions = [] }) {
    const cached: AccountCached = await AccountService.authen(token)
    const roles: Role[] = await RoleService.getCachedRole(cached.project_id)
    const accRole = roles.filter(e => cached.role_ids.map(e => e.toString()).indexOf(e._id.toString() !== -1))
    for (const role of accRole) {
      for (const r of role.api) {
        if (new RegExp(`^${r.path}$`, 'gi').test(path) && _.some(actions, (a) => {
          for (var auAction of r.actions) {
            if (new RegExp(`^${auAction}$`, 'gi').test(a)) {
              return true
            }
          }
          return false
        })) {
          return cached
        }
      }
    }
    throw HttpError.AUTHORIZ('Not allow access')
  }

  static async logout({ token }) {
    await AccountService.setCachedToken(token)
  }

  static async login(user: { username: string, password: string, projectId: Uuid, app?: string }) {
    const acc: Account = await AccountService.mongo.get<Account>(Account, {
      username: user.username,
      project_id: user.projectId
    }, { password: 1, app: 1, token: 1, status: 1, _id: 1, project_id: 1, role_ids: 1 })
    if (!acc) throw HttpError.NOT_FOUND(`Could not found username ${user.username}`)
    await Checker.option(user, 'app', String, undefined, () => {
      if (!acc.app.includes(user.app)) throw HttpError.AUTHEN('Login via social error')
    }, () => {
      if (acc.password !== user.password) throw HttpError.BAD_REQUEST('Password is not matched')
    })
    if (acc.status !== Account.Status.ACTIVED) throw HttpError.BAD_REQUEST('Account not actived')
    const plugins = await ProjectService.getCachedPlugins(acc.project_id)
    if (!plugins || !plugins.oauth) throw HttpError.INTERNAL('oauth plugin not config yet')
    const oauth = plugins.oauth
    if (oauth.single_mode === true) {
      for (const tk of acc.token) {
        await AccountService.setCachedToken(tk)
      }
      acc.token = []
    }
    const token = `${acc.project_id}${acc._id}${Mongo.uuid()}`
    acc.token.push(token)
    await AccountService.mongo.update<Account>(Account, {
      _id: acc._id,
      token: acc.token
    })
    await AccountService.setCachedToken(token, <AccountCached>{
      account_id: acc._id,
      role_ids: acc.role_ids,
      project_id: acc.project_id
    })
    await AccountService.touchCachedToken(token, oauth.session_expired)
    return `${token}?${oauth.session_expired}`
  }

  static async createDefaultAdminAccount(projectId: Uuid, role: Role) {
    // Create default account
    const password = Mongo.uuid().toString().substr(0, 6)
    const admin: Account = await AccountService.insert({
      username: 'admin',
      password: md5(password),
      project_id: projectId,
      recover_by: 'YourEmail@gmail',
      status: Account.Status.ACTIVED,
      role_ids: [role._id],
      native: true,
    })
    // Update owner after create account
    await ProjectService.update({
      _id: projectId,
      owner: `${admin.username}/${password}`
    })
  }

  static async find(fil: any = {}): Promise<Array<Account>> {
    const rs: Account[] = await AccountService.mongo.find<Account>(Account, fil)
    return rs
  }

  static async get(_id: any): Promise<Account> {
    const rs: Account = await AccountService.mongo.get<Account>(Account, _id)
    return rs
  }

  @VALIDATE((body: Account) => {
    body._id = <Uuid>Mongo.uuid()
    Checker.required(body, 'username', String)
    Checker.required(body, 'password', String)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'status', Number)
    Checker.required(body, 'recover_by', String)
    Checker.option(body, 'role_ids', Array, [])
    Checker.option(body, 'more', Object, {})
    body.token = []
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Account, validate?: Function): Promise<Account> {
    const existed = await AccountService.mongo.get(Account, {
      username: body.username,
      project_id: body.project_id
    })
    // Check username must be not existed
    if (existed) throw HttpError.BAD_REQUEST(`Username ${body.username} was existed`)
    const rs: Account = await AccountService.mongo.insert<Account>(Account, body)
    return rs
  }

  @VALIDATE((body: Account) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'password', String)
    Checker.option(body, 'status', Number)
    Checker.option(body, 'recover_by', String)
    Checker.option(body, 'role_ids', Array)
    Checker.option(body, 'more', Object)
    body.updated_at = new Date()
  })
  static async update(body: Account, validate?: Function) {
    const old = <Account>await AccountService.mongo.update<Account>(Account, body, {
      return: true
    })
    if (!old) throw HttpError.NOT_FOUND('Could not found item to update')
    // Check if password was updated
    if (old.password !== body.password) {
      await ProjectService.update({
        _id: old.project_id,
        owner: `${old.username}/******`
      })
    }
    // Clear cached if user is inactived
    if (old.status !== body.status && body.status === Account.Status.INACTIVED) {
      for (const tk of old.token) {
        await AccountService.setCachedToken(tk)
      }
    }
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [undefined, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const old = <Account>await AccountService.mongo.delete<Account>(Account, _id, {
      return: true
    })
    if (!old) throw HttpError.NOT_FOUND('Could not found item to delete')
    // Remove cached
    for (const tk of old.token) {
      await AccountService.setCachedToken(tk)
    }
  }

  ///////////////////// Cached

  static async touchCachedToken(token: string, time: number) {
    await AccountService.redis.touch(`$token:${token}`, time)
  }

  static async setCachedToken(token: string, cached?: AccountCached) {
    if (!cached) return await AccountService.redis.del(`$token:${token}`)
    await AccountService.redis.set(`$token:${token}`, cached)
  }

  static async getCachedToken(token: string): Promise<AccountCached> {
    return await AccountService.redis.get(`$token:${token}`)
  }

}

