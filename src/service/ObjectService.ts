import { VALIDATE, Checker } from 'hinos-validation'
import { Mongo, Uuid } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** MObjectService || 4/10/2017, 10:19:24 AM **
 ************************************************/

/* tslint:disable */
export class MObject {
  _id?: Uuid
}
/* tslint:enable */

export class ObjectService {

  static async find(table: string, projectId: Uuid, fil = {}) {
    const mongo = Mongo.pool(Object.assign({}, AppConfig.mongo, {
      url: AppConfig.mongo.url.replace(/\/\w+$/, `/${projectId}`)
    }))
    return await mongo.find<MObject>(table, fil)
  }

  static async get(table: string, projectId: Uuid, _id: any) {
    const mongo = Mongo.pool(Object.assign({}, AppConfig.mongo, {
      url: AppConfig.mongo.url.replace(/\/\w+$/, `/${projectId}`)
    }))
    return await mongo.get<MObject>(table, _id)
  }

  @VALIDATE((table: string, projectId: Uuid, body: MObject) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(table, [, 'table'], String)
    Checker.required(projectId, [, 'project_id'], Uuid)
  })
  static async insert(table: string, projectId: Uuid, body: MObject) {
    const mongo = Mongo.pool(Object.assign({}, AppConfig.mongo, {
      url: AppConfig.mongo.url.replace(/\/\w+$/, `/${projectId}`)
    }))
    return await mongo.insert<MObject>(table, body)
  }

  @VALIDATE((table: string, projectId: Uuid, body: MObject) => {
    Checker.required(table, [, 'table'], String)
    Checker.required(projectId, [, 'project_id'], Uuid)
    Checker.required(body, '_id', Uuid)
  })
  static async update(table: string, projectId: Uuid, body: MObject) {
    const mongo = Mongo.pool(Object.assign({}, AppConfig.mongo, {
      url: AppConfig.mongo.url.replace(/\/\w+$/, `/${projectId}`)
    }))
    const rs = await mongo.update(table, body, { replace: true })
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((table: string, projectId: Uuid, _id: Uuid) => {
    Checker.required(table, [, 'table'], String)
    Checker.required(_id, [, '_id'], Uuid)
    Checker.required(projectId, [, 'project_id'], Uuid)
  })
  static async delete(table: string, projectId: Uuid, _id: Uuid) {
    const mongo = Mongo.pool(Object.assign({}, AppConfig.mongo, {
      url: AppConfig.mongo.url.replace(/\/\w+$/, `/${projectId}`)
    }))
    const rs = await mongo.delete(table, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }

}
