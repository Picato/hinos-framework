import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { Http } from 'hinos-common/Http'

/************************************************
 ** ServiceService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('MonitorConfig')
/* tslint:disable */
export class MonitorConfig {
  _id?: Uuid
  project_id: Uuid
  mail_to: string[]
  mail_config_id: Uuid
  secret_key: string
}
/* tslint:enable */

export class MonitorConfigService {
  @MONGO()
  private static mongo: Mongo

  static async loadConfig() {
    const configs = await MonitorConfigService.find()
    for (let cf of configs) {
      AppConfig.app.configs[cf.project_id.toString()] = {
        mailConfigId: cf.mail_config_id,
        mailTo: cf.mail_to,
        secretKey: cf.secret_key
      }
    }
  }

  static async getMailConfig({ token }) {
    const resp = await Http.get(`${AppConfig.services.mail}/Mail/Config`, {
      headers: {
        token
      }
    })
    return resp.body
  }

  static async config(data: MonitorConfig, { token }) {
    const resp = await Http.get(`${AppConfig.services.oauth}/Oauth/Secretkey`, {
      headers: {
        token
      }
    })
    if (!resp.body) throw HttpError.CONDITION('Need gen secret key before save configuration')
    const config = await MonitorConfigService.mongo.get<MonitorConfig>(MonitorConfig, {
      project_id: data.project_id
    })
    data.secret_key = resp.body
    if (config) {
      data._id = config._id
      await MonitorConfigService.mongo.update(MonitorConfig, data)
    } else {
      await MonitorConfigService.mongo.insert<MonitorConfig>(MonitorConfig, data)
    }
    AppConfig.app.configs[data.project_id.toString()] = {
      mailConfigId: data.mail_config_id,
      mailTo: data.mail_to,
      secretKey: data.secret_key
    }
  }

  static async get(projectId: Uuid) {
    let config = await MonitorConfigService.mongo.get<MonitorConfig>(MonitorConfig, { project_id: projectId })
    return config
  }

  static async find() {
    return await MonitorConfigService.mongo.find<MonitorConfig>(MonitorConfig)
  }
}
