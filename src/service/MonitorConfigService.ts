import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { SOCKETIO, Socketio } from 'hinos-socketio'
import HttpError from '../common/HttpError'
import { Http } from 'hinos-common/Http'
import { LogService, Log } from './LogService'
import * as portscanner from 'portscanner'
import * as net from 'net'

/************************************************
 ** ServiceService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('MonitorConfig')
export class MonitorConfig {
  _id?: Uuid
  mailTo: string[]
  mailConfigId: Uuid
  secretKey: string
}

export class MonitorConfigService {
  @MONGO()
  private static mongo: Mongo

  static async loadConfig() {
    AppConfig.app.mailConfig = await MonitorConfigService.get()
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
    let config = await MonitorConfigService.mongo.find<MonitorConfig>(MonitorConfig)
    data.secretKey = resp.body
    AppConfig.app.mailConfig = data
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

