import * as httpProxy from 'http-proxy'
import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'

const proxy = httpProxy.createProxyServer()

@Collection('Service')
/* tslint:disable */
export class Service {
  _id?: Uuid
  name?: string
  link?: string
  project_id?: Uuid
  account_id?: Uuid
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export class GatewayService {

  @MONGO()
  private static mongo: Mongo

  static async loadGateway() {
    const services = await GatewayService.find({ $recordsPerPage: 0, $fields: { name: 1, link: 1 } })
    AppConfig.app.gateway = {}
    services.forEach(e => AppConfig.app.gateway[e.name] = e.link)
  }

  static forward({ req, res, params }) {
    return new Promise((resolve, reject) => {
      const target = AppConfig.app.gateway[params.service]
      if (!target) return reject(HttpError.NOT_FOUND(`Could not found service "${params.service}" in gateway`))
      proxy.web(req, res, { target }, (err) => {
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
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Service) {
    const existed = await GatewayService.mongo.get<Service>(Service, {
      name: body.name
    })
    if (existed) throw HttpError.BAD_REQUEST(`The service "${body.name}" is used by someone`)
    const rs = await GatewayService.mongo.insert<Service>(Service, body)
    AppConfig.app.gateway[rs.name] = rs.link
    return rs
  }

  @VALIDATE((where) => {
    Checker.required(where, '_id', Object)
  })
  static async delete(where) {
    const rs = await GatewayService.mongo.delete<Service>(Service, where, {
      return: true
    })
    if (rs) throw HttpError.NOT_FOUND('Could not found item to delete')
    delete AppConfig.app.gateway[rs.name]
  }

}
