import { VALIDATE, Checker } from 'hinos-validation'
import { Mongo, Uuid } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** TableService || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class TableService {

  static async find(projectId: Uuid) {
    const mongo = Mongo.pool(Object.assign({}, AppConfig.mongo, {
      dbname: projectId.toString()
    }))
    const rs = await mongo.manual(TableService.getListTables)
    return rs
  }

  @VALIDATE((name: string, projectId: Uuid) => {
    Checker.required(name, [, 'name'], String)
    Checker.required(projectId, [, 'project_id'], Uuid)
    if (!/^[a-zA-Z][a-zA-Z0-9_]+$/.test(name)) throw HttpError.BAD_REQUEST('Table name must be alphabetic')
    if(name.toLowerCase() === 'object') throw HttpError.BAD_REQUEST('Table name must be not "object"')
  })
  static async insert(name: string, projectId: Uuid) {
    const mongo = Mongo.pool(Object.assign({}, AppConfig.mongo, {
      dbname: projectId.toString()
    }))
    const tables = await mongo.manual(TableService.getListTables)
    const idx = tables.findIndex(e => e.toLowerCase() === name.toLowerCase())
    if (idx !== -1) throw HttpError.BAD_REQUEST(`Table ${name} was existed`)
    await mongo.manual(async (db) => {
      await TableService.addTable(name, db)
    })
    return name
  }

  @VALIDATE((projectId: Uuid, name: String) => {
    Checker.required(projectId, [, 'projectId'], Uuid)
    Checker.required(name, [, 'name'], String)
  })
  static async delete(projectId: Uuid, name: String) {
    const mongo = Mongo.pool(Object.assign({}, AppConfig.mongo, {
      dbname: projectId.toString()
    }))
    const tables = await mongo.manual(TableService.getListTables)
    if (tables.findIndex(e => e.toLowerCase() === name.toLowerCase()) === -1) throw HttpError.BAD_REQUEST('Table not found')
    await mongo.manual(async (db) => {
      await TableService.removeTable(name, db)
    })
  }

  private static getListTables(db) {
    return new Promise((resolve, reject) => {
      db.listCollections().toArray((err, rs) => {
        if (err) return reject(err)
        resolve(rs.map(e => e.name))
      })
    })
  }

  private static addTable(tblName, db) {
    return new Promise((resolve, reject) => {
      db.createCollection(tblName, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  private static removeTable(tblName, db) {
    return new Promise((resolve, reject) => {
      db.dropCollection(tblName, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}
