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
  mail_to: string[]
  mail_config_id: Uuid
  secret_key: string
}
/* tslint:enable */

export class MonitorConfigService {
  @MONGO()
  private static mongo: Mongo

  static async loadConfig() {
    const data = await MonitorConfigService.get()
    AppConfig.app.mailConfig = {
      mailConfigId: data.mail_config_id,
      mailTo: data.mail_to,
      secretKey: data.secret_key
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
    const config = await MonitorConfigService.mongo.find<MonitorConfig>(MonitorConfig)
    data.secret_key = resp.body
    AppConfig.app.mailConfig = {
      mailConfigId: data.mail_config_id,
      mailTo: data.mail_to,
      secretKey: data.secret_key
    }
    if (config.length > 0) {
      data._id = config[0]._id
      await MonitorConfigService.mongo.update(MonitorConfig, data)
    } else {
      await MonitorConfigService.mongo.insert<MonitorConfig>(MonitorConfig, data)
    }
  }

  static async get() {
    let config = await MonitorConfigService.mongo.find<MonitorConfig>(MonitorConfig)
    return config.length > 0 ? config[0] : null
  }
}
