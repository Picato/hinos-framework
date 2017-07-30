import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { REDIS, Redis } from 'hinos-redis'
import HttpError from '../common/HttpError'
import { RoleService } from './RoleService'
import { AccountService } from './AccountService'

/************************************************
 ** ProjectService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Project')
/* tslint:disable */
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
/* tslint:enable */

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
      const caches = await ProjectService.mongo.find<Project>(Project, {
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
      const cached = await ProjectService.mongo.get<Project>(Project, {
        $where: {
          _id: projectId
        },
        $fields: { plugins: 1 }
      })
      await ProjectService.reloadCachedPlugins(cached._id, cached.status === Project.Status.ACTIVED ? cached.plugins : undefined)
    }
  }

  static async find(fil: any = {}) {
    const rs = await ProjectService.mongo.find<Project>(Project, fil)
    return rs
  }

  static async get(_id: any, $fields?: any) {
    const rs = await ProjectService.mongo.get<Project>(Project, _id, $fields)
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
  static async insert(body: Project) {
    const prj = await ProjectService.mongo.insert<Project>(Project, body)
    // Create default role
    const role = await RoleService.createDefaultAdminRole(prj._id)
    // Create default admin account
    await AccountService.createDefaultAdminAccount(prj._id, role)
    // Reload cached
    await ProjectService.reloadCachedPlugins(prj._id, prj.plugins)
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
  static async update(body: Project) {
    body._id = {
      _id: body._id,
      native: {
        $exists: false
      }
    }
    const old = await ProjectService.mongo.update<Project>(Project, body, {
      return: true
    })
    if (!old) throw HttpError.NOT_FOUND('Could not found item to update')
    if (body.status !== undefined) {
      if (old.status !== body.status && body.status === Project.Status.INACTIVED) {
        // Remove cached
        await ProjectService.reloadCachedPlugins(body._id)
        return
      } else if (old.status !== body.status && body.status === Project.Status.ACTIVED) {
        // Reload cached
        await ProjectService.reloadCachedPlugins(body._id, body.plugins)
        return
      }
    }
    if (body.plugins) await ProjectService.reloadCachedPlugins(body._id, body.plugins)
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [undefined, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const rs = await ProjectService.mongo.delete(Project, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found project to delete')
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
      console.log(`Removed ${rs} roles into cached`)
    } else {
      await ProjectService.redis.set(`$plugins:${projectId}`, plugins)
      const rs = await RoleService.reloadCachedRole(projectId)
      console.log(`Loaded ${rs} roles into cached`)
    }
  }

  static async getCachedPlugins(projectId: Uuid) {
    return await ProjectService.redis.get(`$plugins:${projectId}`)
  }

}
