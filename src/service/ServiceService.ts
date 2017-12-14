import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { SOCKETIO, Socketio } from 'hinos-socketio'
import { REDIS, Redis } from 'hinos-redis'
import HttpError from '../common/HttpError'
import axios from 'axios'
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
  status?: number
  email?: String[]
  project_id?: Uuid
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

/* tslint:disable */
export class Log {
  title: string
  type: string
  error: string
  status: number
  service_id: Uuid | string
}
/* tslint:enable */

/* tslint:disable */
export class ServiceCached {
  _id?: Uuid | string
  name?: string
  link?: string
  host?: string
  port?: number
  status?: number
  project_id?: Uuid | string
  email?: string[]
  lastSent?: number

  static castToCached(_e: Service | ServiceCached) {
    const links = _e.link.split(":")
    return JSON.stringify({
      _id: _e._id.toString(),
      name: _e.name,
      link: _e.link,
      host: links[0],
      port: +links[1],
      status: _e.status,
      project_id: _e.project_id,
      email: _e.email,
      lastSent: _e['lastSent'] || 0
    })
  }

  static castToObject(_e: string) {
    const e = JSON.parse(_e) as ServiceCached
    e._id = Mongo.uuid(e._id)
    return e
  }
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

  @REDIS()
  private static redis: Redis

  @SOCKETIO()
  private static socket: Socketio

  static async loadIntoCached(projectId: Uuid) {
    const rs = await ServiceService.mongo.find<Service>(Service, {
      $where: {
        project_id: projectId
      },
      $fields: {
        _id: 1, name: 1, link: 1, status: 1, project_id: 1, email: 1
      },
      $recordsPerPage: 0,
      $sort: {
        updated_at: 1
      }
    })
    await ServiceService.redis.rpush('monitor.temp', rs.map(ServiceCached.castToCached))
  }

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
    const services = await ServiceService.redis.lrange("monitor.temp") as string[]
    for (let i = 0; i < services.length; i++) {
      const s = ServiceCached.castToObject(services[i]) as ServiceCached
      const now = new Date().getTime()
      const mailConfig = JSON.parse(await ServiceService.redis.hget("monitor.config", s.project_id))
      if (!mailConfig) continue
      let log = {
        title: `${s.name}`,
        type: 'MONITOR'
      } as Log
      log['@service_id'] = `${s._id}`
      log['created_at'] = new Date()
      const oldStatus = s.status
      try {
        await ServiceService.checkPortUsing(s.host, s.port, s.name)

        log.status = Service.Status.ALIVE
        s.status = Service.Status.ALIVE

        if (s.status !== Service.Status.ALIVE) {
          ServiceService.mongo.update(Service, {
            _id: s._id,
            status: Service.Status.ALIVE
          })
        }
      } catch (error) {
        s.status = Service.Status.DEAD
        log.status = Service.Status.DEAD
        log.error = error.message || error.toString()

        if (mailConfig && mailConfig.mailTemplateId && ((mailConfig.mailTo && mailConfig.mailTo.length > 0) || (s.email && s.email.length > 0)) && (!s.lastSent || (now - s.lastSent >= AppConfig.app.timeoutSpamMail))) {
          try {
            await axios.put(`${AppConfig.services.mail}/mail/Send/${mailConfig.mailTemplateId}`,
              {
                to: mailConfig.mailTo.concat(s.email as string[] || []),
                _this: {
                  service: s,
                  error: error.toString()
                }
              }, {
                headers: {
                  token: mailConfig.secretKey
                }
              }
            )
          } catch (e) {
            log.error += '\n' + e.message || e.toString()
          } finally {
            s.lastSent = now
          }
        }
      } finally {
        if (log.status !== oldStatus) {
          try {
            await ServiceService.mongo.update(Service, {
              _id: s._id,
              status: log.status
            })
            await ServiceService.pushToLog(log, mailConfig.secretKey)
            await ServiceService.redis.lset("monitor.temp", i, JSON.stringify(s))
          } catch (e) {
            log.error += '\n' + e.message || e.toString()
          }
        } else if (s.lastSent === now) {
          await ServiceService.redis.lset("monitor.temp", i, JSON.stringify(s))
        }
        ServiceService.socket.send('/msg', s.project_id.toString(), log)
      }
    }
    setTimeout(ServiceService.check, AppConfig.app.timeoutPingService)
  }

  static async find(fil = {}) {
    const rs = await ServiceService.mongo.find<Service>(Service, fil)
    return rs
  }

  @VALIDATE((body: Service) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'name', String)
    Checker.required(body, 'link', String)
    Checker.required(body, 'project_id', Uuid)
    Checker.option(body, 'status', Number, 0)
    Checker.option(body, 'email', Array, [])
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Service) {
    const rs = await ServiceService.mongo.insert<Service>(Service, body)
    const config = JSON.parse(await ServiceService.redis.hget("monitor.config", body.project_id.toString()))
    if (config && config.enabled) {
      await ServiceService.redis.rpush('monitor.temp', ServiceCached.castToCached(rs))
    }
    return rs
  }

  @VALIDATE((body: Service) => {
    Checker.required(body, '_id', Object)
    Checker.required(body._id, '_id', Uuid)
    Checker.required(body._id, 'project_id', Uuid)
    Checker.option(body, 'email', Array, [])
    body.updated_at = new Date()
  })
  static async update(body: Service) {
    await ServiceService.mongo.update<Service>(Service, body)
  }

  @VALIDATE((where) => {
    Checker.required(where, '_id', Uuid)
    Checker.required(where, 'project_id', Uuid)
  })
  static async delete(where) {
    const old = await ServiceService.mongo.delete<Service>(Service, where, { return: true }) as Service
    if (!old) throw HttpError.NOT_FOUND('Could not found item to delete')
    const sers = await ServiceService.redis.lrange("monitor.temp") as string[]
    for (let s of sers.map(e => ServiceCached.castToObject(e)) as ServiceCached[]) {
      if (s._id.toString() === old._id.toString()) {
        await ServiceService.redis.lrem("monitor.temp", ServiceCached.castToCached(s))
        break
      }
    }
  }

  private static async pushToLog(log: Log, secretKey: string) {
    await axios.post(`${AppConfig.services.log}/log`, log, {
      headers: {
        token: secretKey
      }
    })
  }
}
