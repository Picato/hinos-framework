import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** ComponentService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('Component')
export class Component {
  _id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  file?: string
  des?: string
  group?: string
  created_at?: Date
  updated_at?: Date
}

export class ComponentService {
  @MONGO()
  private static mongo: Mongo

  static async find(fil = {}) {
    const rs = await ComponentService.mongo.find<Component>(Component, fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await ComponentService.mongo.get<Component>(Component, _id)
    return rs
  }

  @VALIDATE((body: Component) => {
    body._id = <Uuid>Mongo.uuid()
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'file', String)
    Checker.required(body, 'des', String)
    Checker.required(body, 'group', String)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Component, validate?: Function) {
    const rs = await ComponentService.mongo.insert<Component>(Component, body)
    return rs
  }

  @VALIDATE((body: Component) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'project_id', Uuid)
    Checker.option(body, 'account_id', Uuid)
    Checker.option(body, 'file', String)
    Checker.option(body, 'des', String)
    Checker.option(body, 'group', String)
    body.updated_at = new Date()
  })
  static async update(body: Component, validate?: Function) {
    const rs = await ComponentService.mongo.update(Component, body)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [, '_id'], Uuid)
  })
  static async delete(_id: Uuid) {
    const rs = await ComponentService.mongo.delete(Component, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }
}

