import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { REDIS, Redis } from "hinos-redis"
import HttpError from '../common/HttpError'
import { RoleService } from './RoleService'
import { AccountService } from './AccountService'

/************************************************
 ** ProjectService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Project')
export class Project {
  _id?: Uuid
  name?: string
  des?: string
  status?: number
  plugins?: object
  owner?: string
  created_at?: Date
  updated_at?: Date
}

export namespace Project {
  export const Status = {
    ACTIVED: 1,
    INACTIVED: 0
  }
}

export class ProjectService {
  @MONGO()
  private static mongo: Mongo

  @REDIS()
  private static redis: Redis

  static async loadIntoCached(projectId?: Uuid) {
    if (!projectId) {
      const caches = await ProjectService.mongo.find<Project>(Project.toString(), {
        $where: {
          status: Project.Status.ACTIVED
        },
        $fields: { plugins: 1 }
      })
      for (const cached of caches) {
        await ProjectService.reloadCachedPlugins(cached._id, cached.plugins)
      }
      console.log(`Loaded ${caches.length} plugin configuration`)
    } else {
      const cached = await ProjectService.mongo.get<Project>(Project.toString(), {
        $where: {
          _id: projectId
        },
        $fields: { plugins: 1 }
      })
      await ProjectService.reloadCachedPlugins(cached._id, cached.status === Project.Status.ACTIVED ? cached.plugins : undefined)
    }
  }

  static async find(fil: any = {}) {
    const rs = await ProjectService.mongo.find<Project>(Project.toString(), fil)
    return rs
  }

  static async get(_id: any, $fields?: any) {
    const rs = await ProjectService.mongo.get<Project>(Project.toString(), _id, $fields)
    return rs
  }

  @VALIDATE((body: Project) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'name', String)
    Checker.option(body, 'des', String)
    Checker.required(body, 'status', Number)
    Checker.option(body, 'plugins', Object, {
      oauth: {
        single_mode: true,
        session_expired: 2700,
        is_verify: true
      }
    })
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Project, validate?: Function) {
    const prj = await ProjectService.mongo.insert<Project>(Project.toString(), body) as Project
    if (prj.status === Project.Status.ACTIVED) await ProjectService.reloadCachedPlugins(prj._id, prj.plugins)
    // Create default role
    const role = await RoleService.createDefaultAdminRole(prj._id)
    // Create default admin account
    await AccountService.createDefaultAdminAccount(prj._id, role)
    return prj
  }

  @VALIDATE((body: Project) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'name', String)
    Checker.option(body, 'des', String)
    Checker.option(body, 'status', Number)
    Checker.option(body, 'plugins', Object)
    body.updated_at = new Date()
  })
  static async update(body: Project, validate?: Function) {
    const old = await ProjectService.mongo.update<Project>(Project.toString(), body, {
      return: true
    }) as Project
    if (!old) throw HttpError.NOT_FOUND('Could not found item to update')
    if (body.status !== undefined) {
      if (old.status !== body.status && body.status === Project.Status.INACTIVED) {
        // Remove cached
        await ProjectService.reloadCachedPlugins(body._id)
        await RoleService.reloadCachedRole(body._id, true)
        return
      } else if (old.status !== body.status && body.status === Project.Status.ACTIVED) {
        // Reload cached
        await ProjectService.reloadCachedPlugins(body._id, body.plugins)
        await RoleService.reloadCachedRole(body._id)
        return
      }
    }
    if (body.plugins) await ProjectService.reloadCachedPlugins(body._id, body.plugins)
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [undefined, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const rs = await ProjectService.mongo.delete<Project>(Project.toString(), _id) as number
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
    await RoleService.delete({
      project_id: _id
    })
    await ProjectService.reloadCachedPlugins(_id)
  }

  ////////////// Cached

  static async reloadCachedPlugins(projectId: Uuid, plugins?: any) {
    if (!plugins) {
      await ProjectService.redis.del(`$plugins:${projectId}`)
      const rs = await RoleService.reloadCachedRole(projectId, true)
      console.log(`Removed ${rs} roles into cached ${projectId}`);
    } else {
      await ProjectService.redis.set(`$plugins:${projectId}`, plugins)
      const rs = await RoleService.reloadCachedRole(projectId)
      console.log(`Loaded ${rs} roles into cached ${projectId}`);
    }
  }

  static async getCachedPlugins(projectId: Uuid, roles?: any) {
    return await ProjectService.redis.get(`$plugins:${projectId}`)
  }

}

