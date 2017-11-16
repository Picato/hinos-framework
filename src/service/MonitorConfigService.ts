import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import axios from 'axios'
import { REDIS, Redis } from 'hinos-redis'
import { ServiceService, ServiceCached } from './ServiceService';

/************************************************
 ** ServiceService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('MonitorConfig')
/* tslint:disable */
export class MonitorConfig {
  _id?: Uuid
  project_id: Uuid
  mail_to: string[]
  mail_template_id: Uuid
  secret_key: string
  enabled: boolean
}
/* tslint:enable */

export class MonitorConfigService {
  @MONGO()
  private static mongo: Mongo

  @REDIS()
  private static redis: Redis

  static async loadConfig() {
    await MonitorConfigService.redis.del('monitor.config')
    await MonitorConfigService.redis.del('monitor.temp')
    const configs = await MonitorConfigService.find()
    let obj = {}
    for (let cf of configs) {
      obj[cf.project_id.toString()] = JSON.stringify({
        enabled: cf.enabled,
        mailTemplateId: cf.mail_template_id,
        mailTo: cf.mail_to,
        secretKey: cf.secret_key
      })
      if (cf.enabled) {
        ServiceService.loadIntoCached(cf.project_id)
      }
    }
    await MonitorConfigService.redis.hset('monitor.config', obj)
    ServiceService.check()
  }

  static async config(data: MonitorConfig, { token }) {
    const resp = await axios.get(`${AppConfig.services.oauth}/oauth/Secretkey`, {
      headers: {
        token
      }
    })
    if (!resp.data) throw HttpError.CONDITION('Need gen secret key before save configuration')
    const config = await MonitorConfigService.mongo.get<MonitorConfig>(MonitorConfig, {
      project_id: data.project_id
    })
    data.secret_key = resp.data
    if (config) {
      data._id = config._id
      await MonitorConfigService.mongo.update(MonitorConfig, data)
      if (data.enabled !== config.enabled) {
        if (data.enabled) {
          await ServiceService.loadIntoCached(data.project_id)
        } else {
          const sers = await MonitorConfigService.redis.lrange("monitor.temp") as string[]
          for (let s of sers.map(e => JSON.parse(e))) {
            await MonitorConfigService.redis.lrem("monitor.temp", ServiceCached.castToCached(s))
          }
        }
      }
    } else {
      await MonitorConfigService.mongo.insert<MonitorConfig>(MonitorConfig, data)
    }
    await MonitorConfigService.redis.hset('monitor.config', {
      [data.project_id.toString()]: JSON.stringify({
        enabled: data.enabled,
        mailTemplateId: data.mail_template_id,
        mailTo: data.mail_to,
        secretKey: data.secret_key
      })
    })
  }

  static async get(projectId: Uuid) {
    let config = await MonitorConfigService.mongo.get<MonitorConfig>(MonitorConfig, { project_id: projectId })
    return config || {}
  }

  static async find() {
    return await MonitorConfigService.mongo.find<MonitorConfig>(MonitorConfig)
  }
}
