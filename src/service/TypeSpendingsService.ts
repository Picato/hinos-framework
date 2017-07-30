import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { Mongo, Uuid, Collection, MONGO } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** TypeSpendingsService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('ExpensiveNote')
/* tslint:disable */
export class TypeSpendings {
  _id?: Uuid
  name?: string
  icon?: string
  type?: number
  oder?: number
  parent_id?: Uuid
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

export class TypeSpendingsService {

  @MONGO()
  static mongo: Mongo

  static async find(fil: any = {}, auth) {
    return await TypeSpendingsService.mongo.manual(TypeSpendings, async (collection) => {
      const rs0 = await collection.aggregate([{
        $match: {
          'user_id': auth.accountId
        }
      },
      { $unwind: '$type_spendings' },
      { $project: { _id: 0, 'type_spendings': 1 } },
      { $match: fil.$where },
      { $sort: fil.$sort }
      ], { allowDiskUse: true })
      const rs = await rs0.toArray()
      return rs.map(e => e.type_spendings)
    })
  }

  static async get(_id: any, auth: any) {
    return await TypeSpendingsService.mongo.manual(TypeSpendings, async (collection) => {
      const rs = await collection.findOne({
        user_id: auth.accountId,
        'type_spendings._id': _id
      }, { fields: { 'type_spendings.$': 1, _id: 0 } })
      return rs.type_spendings.length === 1 ? rs.type_spendings[0] : null
    })
  }

  static async createDefaultData(auth) {
    let df: Array<any> = [
      // Others
      { oder: 1, name: 'Received from wallet', icon: [9, 11], type: 0 },
      { oder: 1, name: 'Transfer to wallet', icon: [6, 10], type: 0 },
      { oder: 1, name: 'Add new wallet', icon: [0, 10], type: 0 },
      { oder: 1, name: 'Update wallet', icon: [0, 10], type: 0 },
      // Earning
      {
        oder: 1, name: 'Lương', icon: [9, 2], type: 1,
        childs: [
          { oder: 2, name: 'Thưởng', icon: [7, 9], type: 1 }
        ]
      },
      { oder: 3, name: 'Bán hàng', icon: [10, 0], type: 1 },
      { oder: 4, name: 'Được cho', icon: [6, 11], type: 1 },
      { oder: 5, name: 'Tiền lãi', icon: [7, 11], type: 1 },
      { oder: 100, name: 'Khoản thu khác', icon: [1, 4], type: 1 },
      // Spending
      {
        oder: 1, name: 'Gia đình', icon: [9, 10], type: -1,
        childs: [
          { oder: 2, name: 'Con cái', icon: [10, 6], type: -1 }
        ]
      },
      { oder: 3, name: 'Điện & nước & internet', icon: [12, 6], type: -1 },
      { oder: 3, name: 'Ăn uống', icon: [1, 0], type: -1 },
      { oder: 4, name: 'Bạn bè & người yêu', icon: [0, 0], type: -1 },
      { oder: 5, name: 'Du lịch', icon: [11, 0], type: -1 },
      { oder: 7, name: 'Giáo dục', icon: [7, 10], type: -1 },
      { oder: 8, name: 'Mua sắm', icon: [2, 0], type: -1 },
      { oder: 9, name: 'Y tế & Sức khoẻ', icon: [2, 11], type: -1 },
      { oder: 10, name: 'Đi lại', icon: [1, 2], type: -1 },
      { oder: 10, name: 'Cho vay', icon: [6, 10], type: -1 },
      { oder: 100, name: 'Khoản chi phí khác', icon: [1, 4], type: -1 }
    ]
    for (let e of df) {
      e.icon = `-${e.icon[0] * 53}px -${e.icon[1] * 64}px`
      let d = _.cloneDeep(e)
      delete d.childs
      let parent = await TypeSpendingsService.insert(d as TypeSpendings, auth)
      if (e.childs) {
        e.childs.map(async (e0) => {
          e0.icon = `-${e0.icon[0] * 53}px -${e0.icon[1] * 64}px`
          e0.parent_id = parent._id
          await TypeSpendingsService.insert(e0 as TypeSpendings, auth)
        })
      }
    }
  }

  @VALIDATE((body: TypeSpendings) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'name', String)
    Checker.option(body, 'icon', String)
    Checker.required(body, 'type', Number)
    Checker.option(body, 'oder', Number, 1)
    Checker.option(body, 'parent_id', Uuid)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: TypeSpendings, auth: any): Promise<TypeSpendings> {
    return await TypeSpendingsService.mongo.manual(TypeSpendings, async (collection) => {
      await collection.update(
        { user_id: auth.accountId },
        {
          $push: {
            'type_spendings': body
          }
        })
      return body
    })
  }

  @VALIDATE((body: TypeSpendings) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'name', String)
    Checker.option(body, 'icon', String)
    Checker.option(body, 'type', Number)
    Checker.option(body, 'oder', Number)
    Checker.option(body, 'parent_id', Uuid)
    Checker.option(body, 'created_at', Date)
    body.updated_at = new Date()
  })
  static async update(body: TypeSpendings, auth: any) {
    return await TypeSpendingsService.mongo.manual(TypeSpendings, async (collection) => {
      const rs = await collection.update(
        {
          user_id: auth.accountId,
          'type_spendings._id': body._id
        }, {
          $set: { 'type_spendings.$': body }
        })
      return rs
    })
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [, '_id'], Uuid)
  })
  static async delete(_id: Uuid, auth: any) {
    return await TypeSpendingsService.mongo.manual(TypeSpendings, async (collection) => {
      const childs = await collection.count({
        user_id: auth.accountId,
        'type_spendings.parent_id': _id
      })
      if (childs > 0) throw HttpError.CONDITION('Need to remove all of childs before delete it')
      const refSpending = await collection.count({
        user_id: auth.accountId,
        'spendings.type_spending_id': _id
      })
      if (refSpending > 0) throw HttpError.CONDITION('Some items in spending is using it. required remove it first')
      const rs = await collection.update(
        {
          user_id: auth.accountId
        }, {
          $pull: {
            type_spendings: {
              _id
            }
          }
        })
      return rs
    })
  }
}
