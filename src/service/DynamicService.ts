import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** DynamicService || 4/10/2017, 10:19:24 AM **
 ************************************************/

/* tslint:disable */
export class Dynamic {
  _id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  type?: any
  title?: string
  table?: string
  // status?: number
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export class DynamicService {
  @MONGO()
  private static mongo: Mongo

  static async find(table: string, projectId: Uuid, fil = {}) {
    const rs = await DynamicService.mongo.find<Dynamic>(DynamicService.getTableDynamic(projectId, table), fil)
    return rs
  }

  static async get(table: string, projectId: Uuid, _id: any) {
    const rs = await DynamicService.mongo.get<Dynamic>(DynamicService.getTableDynamic(projectId, table), _id, { project_id: 0 })
    return rs
  }

  @VALIDATE((table: string, body: Dynamic) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(table, [, 'table'], String)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(table: string, body: Dynamic) {
    const rs = await DynamicService.mongo.insert<Dynamic>(DynamicService.getTableDynamic(body.project_id, table), body)
    return rs
  }

  @VALIDATE((table: string, body: Dynamic) => {
    Checker.required(table, [, 'table'], String)
    Checker.required(body, '_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'project_id', Uuid)
    body.updated_at = new Date()
  })
  static async update(table: string, body: Dynamic) {
    const rs = await DynamicService.mongo.update(DynamicService.getTableDynamic(body.project_id, table), body, { replace: true })
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((table: string, _id: any) => {
    Checker.required(table, [, 'table'], String)
    Checker.required(_id, [, '_id'], Uuid)
  })
  static async delete(table: string, _id: any) {
    const rs = await DynamicService.mongo.delete(DynamicService.getTableDynamic(_id.project_id, table), _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }

  static getTableDynamic(projectId, table) {
    return projectId.toString() + '_' + table
  }
}
