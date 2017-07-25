import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { SOCKETIO, Socketio } from 'hinos-socketio'
import HttpError from '../common/HttpError'
import { Http } from 'hinos-common/Http'
import { LogService, Log } from './LogService'
import * as portscanner from 'portscanner'

/************************************************
 ** ServiceService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Service')
/* tslint:disable */
export class Service {
  _id?: Uuid
  name?: string
  link?: string
  logs?: Log[]
  status?: number
  lastSent?: Date
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export namespace Service {
  export const Status = {
    NEW: 0,
    ALIVE: 1,
    DEAD: -1
  }
}

export class ServiceService {
  @MONGO()
  private static mongo: Mongo

  @SOCKETIO()
  private static socket: Socketio

  static checkPortUsing(ip, port, name) {
    return new Promise((resolve, reject) => {
      portscanner.checkPortStatus(port, ip, function (error, status) {
        if (error) return reject(error)
        if (status !== 'open') return reject(new Error(`Could not connect to "${name}" ${ip}:${port}`))
        resolve()
      })

    })
  }

  static async check() {
    const services = await ServiceService.mongo.find<Service>(Service)
    for (let s of services) {
      let msg
      const [host, port] = s.link.split(':')
      try {
        await ServiceService.checkPortUsing(host, +port, s.name)
        msg = await LogService.insert({
          service_id: s._id,
          status: Service.Status.ALIVE
        })
        if (s.status !== Service.Status.ALIVE) {
          ServiceService.mongo.update(Service, {
            _id: s._id,
            status: Service.Status.ALIVE
          })
        }
      } catch (error) {
        msg = await LogService.insert({
          service_id: s._id,
          error: error.toString(),
          status: Service.Status.DEAD
        })
        let item: Service = {
          _id: s._id,
          status: Service.Status.DEAD
        }
        if (AppConfig.app.mailConfig && AppConfig.app.mailConfig.mailConfigId && AppConfig.app.mailConfig.secretKey && AppConfig.app.mailConfig.secretKey.length > 0 && AppConfig.app.mailConfig.mailTo && AppConfig.app.mailConfig.mailTo.length > 0 && (!s.lastSent || (s.lastSent.getTime() - new Date().getTime() >= AppConfig.app.timeoutSpamMail))) {
          try {
            await Http.post(`${AppConfig.services.mail}/Mail/Send/${AppConfig.app.mailConfig.mailConfigId}`, {
              headers: {
                token: AppConfig.app.mailConfig.secretKey
              },
              data: {
                subject: `Micro service ${s.name} is downing, please check ASAP !`,
                text: error.toString(),
                from: 'Monitor@email.com',
                to: AppConfig.app.mailConfig.mailTo
              }
            })
            item.lastSent = new Date()
          } finally {
            if (s.status !== Service.Status.DEAD) {
              ServiceService.mongo.update(Service, item)
            }
          }
        }
      } finally {
        ServiceService.socket.send('/msg', AppConfig.app.wsSession, msg)
      }
    }
    setTimeout(ServiceService.check, AppConfig.app.timeoutPingService)
  }

  static async find(fil = {}) {
    const rs = await ServiceService.mongo.find<Service>(Service, fil)
    for (let i in rs) {
      rs[i].logs = await LogService.find({
        $where: {
          service_id: rs[i]._id
        },
        $sort: { created_at: -1 },
        $recordsPerPage: 50
      })
    }
    return rs
  }

  @VALIDATE((body: Service) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'name', String)
    Checker.required(body, 'link', String)
    Checker.option(body, 'status', Number, 0)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Service) {
    const rs = await ServiceService.mongo.insert<Service>(Service, body)
    return rs
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const rs = await ServiceService.mongo.delete(Service, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }
}
