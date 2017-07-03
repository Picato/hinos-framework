import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { REDIS, Redis } from 'hinos-redis'
import HttpError from '../common/HttpError'

/************************************************
 ** RoleService || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class Action {
  path: string
  actions: string[]
}

@Collection('Role')
export class Role {
  _id?: Uuid
  name?: string
  project_id?: Uuid
  api?: Action[]
  web?: Action[]
  mob?: Action[]
  created_at?: Date
  updated_at?: Date
}

export class RoleService {
  @MONGO()
  private static mongo: Mongo

  @REDIS()
  private static redis: Redis

  static async createDefaultAdminRole(projectId: Uuid) {
    const rs: Role = await RoleService.insert({
      name: 'Admin',
      api: [{
        path: '.*',
        actions: ['.*']
      }],
      project_id: projectId
    })
    return rs
  }

  static async find(fil: any = {}) {
    const rs = await RoleService.mongo.find<Role>(Role.toString(), fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await RoleService.mongo.get<Role>(Role.toString(), _id)
    return rs
  }

  @VALIDATE((body: Role) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'name', String)
    Checker.required(body, 'project_id', Uuid)
    Checker.option(body, 'api', Array, [])
    Checker.option(body, 'web', Array, [])
    Checker.option(body, 'mob', Array, [])
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Role, validate?: Function) {
    const rs = await RoleService.mongo.insert<Role>(Role.toString(), body) as Role
    // Reload cache
    await RoleService.reloadCachedRole(body.project_id)
    return rs
  }

  @VALIDATE((body: Role) => {
    Checker.required(body, '_id', Uuid)
    Checker.required(body, 'project_id', Uuid)
    Checker.option(body, 'name', String)
    Checker.option(body, 'api', Array)
    Checker.option(body, 'web', Array)
    Checker.option(body, 'mob', Array)
    body.updated_at = new Date()
  })
  static async update(body: Role, validate?: Function) {
    const rs = await RoleService.mongo.update<Role>(Role.toString(), body) as number
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
    // Reload cache
    await RoleService.reloadCachedRole(body.project_id)
  }

  @VALIDATE((key) => {
    Checker.option(key, '_id', Uuid)
    Checker.required(key, ['project_id'], Uuid)
  })
  static async delete(key: { _id?: Uuid, project_id: Uuid }) {
    const rs = await RoleService.mongo.delete<Role>(Role.toString(), key, {
      multiple: !key._id
    }) as number
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
    // Reload cache
    await RoleService.reloadCachedRole(key.project_id)
  }

  ////////////// Cached

  static async reloadCachedRole(projectId: Uuid, isRemoved?: boolean) {
    if (isRemoved) {
      const roles = await RoleService.redis.get(`$roles:${projectId}`)
      await RoleService.redis.del(`$roles:${projectId}`)
      return roles.length
    }
    const roles = await RoleService.find({
      project_id: projectId
    })
    await RoleService.redis.set(`$roles:${projectId}`, roles)
    return roles.length
  }

  static async getCachedRole(projectId: Uuid) {
    return await RoleService.redis.get(`$roles:${projectId}`) as Role[]
  }

}

