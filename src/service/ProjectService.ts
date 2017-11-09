import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { REDIS, Redis } from 'hinos-redis'
import HttpError from '../common/HttpError'
import { RoleService } from './RoleService'
import { AccountService } from './AccountService'
import Utils from '../common/Utils';

/************************************************
 ** ProjectService || 4/10/2017, 10:19:24 AM **
 ************************************************/

export type Plugin = {
  oauth?: {
    app?: string[]
    mail_verify_template?: Uuid
    session_expired?: number
    single_mode?: boolean
    trying?: number
  }
}

@Collection('Project')
/* tslint:disable */
export class Project {
  _id?: Uuid
  uname?: string
  name?: string
  des?: string
  status?: number
  plugins?: Plugin
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
        $fields: { plugins: 1, uname: 1 },
        $recordsPerPage: -1
      })
      for (const cached of caches) {
        await ProjectService.reloadCachedPlugins(cached._id, cached.uname, cached.plugins)
      }
      console.log(`Loaded ${caches.length} plugin configuration`)
    } else {
      const cached = await ProjectService.mongo.get<Project>(Project, {
        $where: {
          _id: projectId
        },
        $fields: { plugins: 1, uname: 1 }
      })
      await ProjectService.reloadCachedPlugins(cached._id, cached.uname, cached.status === Project.Status.ACTIVED ? cached.plugins : undefined)
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
    body.uname = Utils.getUname(body.name)
    if (!body.uname) return HttpError.BAD_REQUEST('Name is not valid format')
    Checker.option(body, 'des', String)
    Checker.required(body, 'status', Number)
    Checker.option(body, 'plugins', Object, {
      oauth: {
        single_mode: true,
        session_expired: 2700,
        mail_verify_template: undefined,
        app: [],
        trying: 3
      }
    })
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Project) {
    const oldPrj = await ProjectService.mongo.get<Project>({ uname: body.uname }, { _id: 1 })
    if (oldPrj) throw HttpError.BAD_REQUEST('Got project which has same name')
    const prj = await ProjectService.mongo.insert<Project>(Project, body)
    // Create default role
    const role = await RoleService.createDefaultAdminRole(prj._id)
    // Create default admin account
    await AccountService.createDefaultAdminAccount(prj._id, role)
    // Reload cached
    await ProjectService.reloadCachedPlugins(prj._id, prj.uname, prj.plugins)
    return prj
  }

  @VALIDATE((body: Project) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'des', String)
    Checker.option(body, 'status', Number)
    Checker.option(body, 'plugins', Object)
    body.updated_at = new Date()
  })
  static async update(body: Project) {
    body._id = body._id
    const old = await ProjectService.mongo.update<Project>(Project, body, { return: true })
    if (!old) throw HttpError.NOT_FOUND('Could not found item to update')
    if (body.status !== undefined) {
      if (old.status !== body.status && body.status === Project.Status.INACTIVED) {
        // Remove cached
        await ProjectService.reloadCachedPlugins(old._id, old.uname)
        return
      } else if (old.status !== body.status && body.status === Project.Status.ACTIVED) {
        // Reload cached
        await ProjectService.reloadCachedPlugins(old._id, old.uname)
        return
      }
    }
    if (body.plugins) await ProjectService.reloadCachedPlugins(old._id, old.uname, body.plugins)
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [undefined, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const old = await ProjectService.mongo.delete<Project>(Project, _id, { return: true })
    if (!old) throw HttpError.NOT_FOUND('Could not found project to delete')
    await RoleService.delete({
      project_id: _id
    })
    await ProjectService.reloadCachedPlugins(old._id, old.uname)
  }

  ////////////// Cached

  static async reloadCachedPlugins(projectId: Uuid, projectUName: string, plugins?: any) {
    if (!plugins) {
      if (projectId) {
        await ProjectService.redis.del(`$plugins:${projectId}`)
        const rs = await RoleService.reloadCachedRole(projectId, true)
        console.log(`Removed ${rs} roles into cached`)
      }
      if (projectUName) {
        await ProjectService.redis.del(`$plugins:${projectUName}`)
        const rs = await RoleService.reloadCachedRole(projectUName, true)
        console.log(`Removed ${rs} roles into cached`)
      }
    } else {
      if (projectId) {
        await ProjectService.redis.hset(`$plugins:${projectId}`, {
          projectId: projectId.toString(),
          plugins: JSON.stringify(plugins)
        })
        const rs = await RoleService.reloadCachedRole(projectId)
        console.log(`Loaded ${rs} roles into cached`)
      }
      if (projectUName) {
        await ProjectService.redis.hset(`$plugins:${projectUName}`, {
          projectId: projectId.toString(),
          plugins: JSON.stringify(plugins)
        })
        const rs = await RoleService.reloadCachedRole(projectUName)
        console.log(`Loaded ${rs} roles into cached`)
      }
    }
  }

  static async getCachedPlugins(projectIdUname: Uuid | string) {
    const rs = await ProjectService.redis.hget(`$plugins:${projectIdUname}`) as { projectId: string, plugins: string }
    return {
      projectId: Mongo.uuid(rs.projectId),
      plugins: JSON.parse(rs.plugins) as Plugin
    }
  }

}
