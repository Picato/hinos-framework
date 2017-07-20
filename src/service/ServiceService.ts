import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { LogService, Log } from './LogService'
import * as portscanner from 'portscanner'
import * as net from 'net'

/************************************************
 ** ServiceService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Service')
export class Service {
  _id?: Uuid
  name?: string
  link?: string
  logs?: Log[]
  status?: number
  created_at?: Date
  updated_at?: Date
}

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

  static checkPortUsing(ip, port) {
    return new Promise((resolve, reject) => {
      portscanner.checkPortStatus(port, ip, function (error, status) {
        if (error) return reject(error)
        if (status !== 'open') return reject(new Error(`${ip}:${port} is not be using`))
        resolve()
      })

    })
  }

  static async check() {
    const services = await ServiceService.mongo.find<Service>(Service)
    for (let s of services) {
      const [host, port] = s.link.split(':')
      try {
        await ServiceService.checkPortUsing(host, +port)
        await LogService.insert({
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
        await LogService.insert({
          service_id: s._id,
          error: error.toString(),
          status: Service.Status.DEAD
        })
        if (s.status !== Service.Status.DEAD) {
          ServiceService.mongo.update(Service, {
            _id: s._id,
            status: Service.Status.DEAD
          })
        }
      }
    }
    setTimeout(ServiceService.check, 10000)
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
    body._id = <Uuid>Mongo.uuid()
    Checker.required(body, 'name', String)
    Checker.required(body, 'link', String)
    Checker.option(body, 'status', Number, 0)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Service, validate?: Function) {
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

