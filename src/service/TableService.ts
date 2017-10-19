import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { DynamicService } from './DynamicService'

/************************************************
 ** TableService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Table')
/* tslint:disable */
export class Table {
  _id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  name?: string
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export class TableService {
  @MONGO()
  private static mongo: Mongo

  static async find(fil = {}) {
    const rs = await TableService.mongo.find<Table>(Table, fil)
    return rs
  }

  @VALIDATE((body: Table) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'name', String)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Table) {
    const existed = await TableService.mongo.get<Table>(Table, {
      project_id: body.project_id,
      name: body.name
    })
    if (existed) return existed
    const rs = await TableService.mongo.insert<Table>(Table, body)
    return rs
  }

  @VALIDATE((projectId: Uuid, _id: Uuid) => {
    Checker.required(projectId, [, 'projectId'], Uuid)
    Checker.required(_id, [, '_id'], Uuid)
  })
  static async delete(projectId: Uuid, _id: Uuid) {
    const rs = await TableService.mongo.delete<Table>(Table, _id, { return: true })
    if (!rs) throw HttpError.NOT_FOUND('Could not found item to delete')
    try {
      const isDroped = await TableService.mongo.manual(async (db) => {
        return await db.dropCollection(DynamicService.getTableDynamic(projectId, rs.name))
      })
      if (!isDroped) throw HttpError.INTERNAL('Could not drop table')
    } catch (e) {
      console.error(e)
    }
  }
}
