import * as httpProxy from 'http-proxy'
import * as fs from 'fs'
import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { Http } from 'hinos-common/Http'

const proxy = httpProxy.createProxyServer()

@Collection('Service')
/* tslint:disable */
export class Service {
  _id?: Uuid
  name?: string
  link?: string
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export class GatewayService {

  @MONGO()
  private static mongo: Mongo

  static async loadGateway() {
    const services = await GatewayService.find({ $recordsPerPage: 0, $fields: { name: 1, link: 1 } })
    AppConfig.gateway = {}
    services.forEach(e => AppConfig.gateway[e.name] = e.link)
  }

  static forward({ req, res, params }) {
    return new Promise((resolve, reject) => {
      proxy.web(req, res, { target: AppConfig.gateway[params.service] }, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  static async find(fil = {}) {
    return await GatewayService.mongo.find<Service>(Service, fil)
  }

  @VALIDATE((body: Service) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'name', String)
    Checker.required(body, 'link', String)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Service, validate?: Function) {
    const rs = await GatewayService.mongo.insert<Service>(Service, body)
    return rs
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const rs = await GatewayService.mongo.delete(Service, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }

}
