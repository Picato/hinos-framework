import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { REDIS, Redis } from 'hinos-redis'
import HttpError from '../common/HttpError'
import { RoleService, RoleCached, RoleApiCached } from './RoleService'
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

/* tslint:disable */
export type PluginCached = {
  project_id: string
  oauth?: {
    app?: string[]
    mail_verify_template?: Uuid
    session_expired?: number
    single_mode?: boolean
    trying?: number
  }
}
/* tslint:enable */

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

/* tslint:disable */
export class ProjectCached {
  _id: string
  name: string
  plugins?: PluginCached
  roles: RoleCached
  apis: RoleApiCached

  static castToCached(projectId: any, _e: any | Plugin) {
    _e.project_id = projectId
    return JSON.stringify(_e)
  }

  static castToObject(plugins) {
    return JSON.parse(plugins)
  }
  // static castToObject(_e) {
  //   if (!_e) return _e
  //   return JSON.parse(_e) as AccountCached
  //   // e._id = Mongo.uuid(e._id)
  //   // e.project_id = Mongo.uuid(e.project_id)
  //   // e.account_id = Mongo.uuid(e.account_id)
  //   // e.role_ids = (e.role_ids as string[]).map(e => Mongo.uuid(e)) as Uuid[]
  // }
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
        await ProjectService.reloadCachedPlugins(cached._id, cached.uname, { plugins: cached.plugins, roles: true })
      }
    } else {
      const cached = await ProjectService.mongo.get<Project>(Project, {
        $where: {
          _id: projectId
        },
        $fields: { plugins: 1, uname: 1 }
      })
      await ProjectService.reloadCachedPlugins(cached._id, cached.uname, cached.status === Project.Status.ACTIVED ? { plugins: cached.plugins } : undefined)
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
    await ProjectService.reloadCachedPlugins(prj._id, prj.uname, { plugins: prj.plugins })
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
        body = _.merge({}, old, body)
        await ProjectService.reloadCachedPlugins(old._id, old.uname, { plugins: body.plugins, roles: true })
        return
      }
    }
    if (body.plugins) await ProjectService.reloadCachedPlugins(old._id, old.uname, { plugins: body.plugins })
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

  static async reloadCachedPlugins(projectId: Uuid, projectUName: string, values?: { plugins?: any, roles?: any }) {
    if (!values) {
      if (projectId) await ProjectService.redis.del(`$p:${projectId}`)
      if (projectUName) await ProjectService.redis.del(`$p:${projectUName}`)
    } else {
      let { plugins, roles } = values
      let cached = {} as any
      if (projectId) cached._id = projectId.toString()
      if (projectUName) cached.name = projectUName
      if (plugins) cached.plugins = ProjectCached.castToCached(projectId, plugins)
      if (roles) {
        if (roles === true) {
          roles = await RoleService.find({
            $where: { project_id: projectId },
            $recordsPerPage: 0,
            $fields: { _id: 1, api: 1, web: 1, mob: 1 }
          })
        }
        cached.roles = RoleCached.castToCached(projectId, roles)
        cached.apis = RoleApiCached.castToCached(projectId, roles)
      }
      if (projectId) await ProjectService.redis.hset(`$p:${projectId}`, cached)
      if (projectUName) await ProjectService.redis.hset(`$p:${projectUName}`, cached)
    }
  }

  static async getCached(projectIdUname: Uuid | string, type?: 'plugins' | 'roles' | 'apis' | 'name' | '_id') {
    const rs = await ProjectService.redis.hget(`$p:${projectIdUname}`, type)
    return (!['name', '_id'].includes(type) ? ProjectCached.castToObject(rs) : rs) as PluginCached | RoleCached | RoleApiCached | ProjectCached | string
  }

}
