import { VALIDATE, Checker } from 'hinos-validation'
import { Mongo, Uuid, Collection, MONGO } from 'hinos-mongo'
import { WalletService } from './WalletService'
import { TypeSpendingsService } from './TypeSpendingsService'
import HttpError from '../common/HttpError'
import { LogService } from './LogService'

/************************************************
 ** SpendingsService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('ExpensiveNote')
/* tslint:disable */
export class Spendings {
  _id?: Uuid
  money?: number
  wallet_money0?: number
  wallet_money1?: number
  input_date?: Date
  des?: string
  udes?: string
  type_spending_id?: Uuid
  wallet_id?: Uuid
  walletGS_id?: Uuid // Goal save
  is_bookmark?: boolean
  type?: number
  sign_money?: number
  date?: number
  month?: number
  year?: number
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

@Collection('ExpensiveNote')
/* tslint:disable */
export class ExpensiveNote {
  user_id?: Uuid
  spendings?: Array<any>
  wallets?: Array<any>
  type_spendings?: Array<any>
}
/* tslint:enable */

export class SpendingsService {

  @MONGO()
  static mongo: Mongo

  static async find(fil: any = {}, auth: any): Promise<Array<Spendings>> {
    const rs = await SpendingsService.mongo.manual(Spendings, async (collection) => {
      const rs0 = await collection.aggregate([
        { $match: { 'user_id': auth.accountId } },
        { $unwind: '$spendings' },
        { $match: fil.$where },
        { $sort: { 'spendings.input_date': -1 } },
        { $project: { _id: 0, 'spendings': { money: 1, input_date: 1, des: 1, wallet_id: 1, type_spending_id: 1, type: 1, _id: 1, is_bookmark: 1, sign_money: 1, walletGS_id: 1, wallet_money0: 1, wallet_money1: 1 } } }
      ], { allowDiskUse: true })
      const rs = await rs0.toArray()
      return rs.map((e) => {
        return e.spendings
      })
    })
    return rs
  }

  static async getSuggestion(auth) {
    const rs = await SpendingsService.mongo.manual(ExpensiveNote, async (collection) => {
      const now = new Date()
      const rs = await collection.aggregate([
        { $match: { 'user_id': auth.accountId } },
        { $unwind: '$spendings' },
        {
          $match: {
            'spendings.sign_money': {
              $ne: 0
            },
            'spendings.input_date': {
              $lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999),
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 23, 59, 59, 999)
            },
            'spendings.udes': { $exists: true, $not: { $size: 0 } }
          }
        },
        {
          $group: {
            _id: '$spendings.udes',
            count: { $sum: 1 },
            spendings: { $last: '$spendings' }
          }
        },
        { $sort: { count: -1, 'spendings.updated_at': -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            spendings: {
              type_spending_id: 1,
              wallet_id: 1,
              walletGS_id: 1,
              type: 1
            }
          }
        }], { allowDiskUse: true })
      const arr = await rs.toArray()
      return arr
    })
    return rs
  }

  static async get(_id: any, auth: any) {
    const rs = await SpendingsService.mongo.manual(Spendings, async (collection) => {
      const rs = await collection.findOne({
        user_id: auth.accountId,
        'spendings._id': _id
      }, { fields: { 'spendings.$': 1, _id: 0 } })
      return rs.spendings.length === 1 ? rs.spendings[0] : null
    })
    return rs
  }

  static async statisticByMonth(where, auth) {
    return await SpendingsService.mongo.manual(Spendings, async (collection) => {
      const rs = await collection.aggregate([
        {
          $match: { user_id: auth.accountId }
        }, {
          $project: { _id: 0, spendings: 1 }
        }, {
          $unwind: '$spendings'
        }, {
          $match: where
        }, {
          $group: {
            _id: {
              month: '$spendings.month',
              year: '$spendings.year'
            },
            smoney: {
              $sum: {
                $cond: [
                  { $eq: ['$spendings.type', -1] },
                  '$spendings.money',
                  0
                ]
              }
            },
            emoney: {
              $sum: {
                $cond: [
                  { $eq: ['$spendings.type', 1] },
                  '$spendings.money',
                  0
                ]
              }
            }
          }
        }, {
          $sort: { input_date: 1 }
        }], { allowDiskUse: true })
      return await rs.toArray()
    })
  }

  static async statisticByTypeSpending(where, auth) {
    return await SpendingsService.mongo.manual(Spendings, async (collection) => {
      const rs = await collection.aggregate([
        {
          $match: {
            user_id: auth.accountId
          }
        }, {
          $project: { _id: 0, spendings: 1 }
        }, {
          $unwind: '$spendings'
        }, {
          $match: where
        }, {
          $group: {
            _id: '$spendings.type_spending_id',
            money: { $sum: '$spendings.money' }
          }
        }, {
          $sort: {
            money: -1
          }
        }], { allowDiskUse: true })
      return await rs.toArray()
    })
  }

  static async createUser(auth) {
    const rs = await SpendingsService.mongo.get(Spendings, {
      user_id: auth.accountId
    })
    if (!rs) {
      return await SpendingsService.mongo.insert<ExpensiveNote>(Spendings, {
        user_id: auth.accountId,
        spendings: [],
        wallets: [],
        type_spendings: []
      })
    }
    return rs
  }

  static async unbookmark(_id, auth) {
    const rs = await SpendingsService.mongo.manual(Spendings, async (collection) => {
      let item = await SpendingsService.get(_id, auth)
      item.is_bookmark = false
      const rs = await collection.update(
        {
          user_id: auth.accountId,
          'spendings._id': _id
        }, {
          $set: {
            'spendings.$': item
          }
        })
      return rs
    })
    return rs
  }

  @VALIDATE((body: Spendings) => {
    body._id = Mongo.uuid() as Uuid
    Checker.option(body, 'money', Number, 0)
    Checker.required(body, 'input_date', Date)
    Checker.option(body, 'des', String, (des) => {
      body.udes = SpendingsService.toUnsign(des)
    })
    Checker.required(body, 'wallet_id', Uuid)
    Checker.option(body, 'walletGS_id', Uuid)
    Checker.required(body, 'type_spending_id', Uuid)
    Checker.option(body, 'is_bookmark', Boolean, false)
    Checker.required(body, 'type', Number)
    if (body.sign_money === undefined) body.sign_money = body.money * body.type
    body.date = body.input_date.getDate()
    body.month = body.input_date.getMonth()
    body.year = body.input_date.getFullYear()
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Spendings, auth: any, isUpdateWallet: boolean) {
    return await SpendingsService.mongo.manual(Spendings, async (collection) => {
      let msgs = []
      msgs.push(`### ADD ITEM ###`)
      await collection.update(
        {
          user_id: auth.accountId
        }, {
          $push: {
            'spendings': body
          }
        })
      const wallet = await WalletService.get(body.wallet_id, auth)
      const typeSpending = await TypeSpendingsService.get(body.type_spending_id, auth)
      msgs.push(` - ${wallet.name} >>> ${typeSpending.name} = ${body.type > 0 ? '+' : body.type < 0 ? '-' : ''}${SpendingsService.formatNumber(body.money)} (${body.input_date.getDate()}/${body.input_date.getMonth() + 1}/${body.input_date.getFullYear()})`)
      if (isUpdateWallet && body.money > 0) { // check them type ko thong ke
        wallet.money += body.sign_money
        await WalletService.update(wallet, auth)

        if (body.walletGS_id) {
          const wallet = await WalletService.get(body.walletGS_id, auth)
          wallet.money += body.sign_money
          await WalletService.update(wallet, auth)
        }
      }
      if (body.des && body.des.length > 0) msgs.push(`#Note: ${body.des}`)
      await LogService.push({
        type: 1,
        data: msgs
      }, auth)
      return body
    })
  }

  @VALIDATE((body: Spendings) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'money', Number, 0)
    Checker.required(body, 'input_date', Date)
    Checker.option(body, 'des', String, (des) => {
      body.udes = SpendingsService.toUnsign(des)
    })
    Checker.required(body, 'wallet_id', Uuid)
    Checker.option(body, 'walletGS_id', Uuid)
    Checker.required(body, 'type_spending_id', Uuid)
    Checker.option(body, 'is_bookmark', Boolean, false)
    Checker.required(body, 'type', Number)
    if (body.sign_money === undefined) body.sign_money = body.money * body.type
    body.date = body.input_date.getDate()
    body.month = body.input_date.getMonth()
    body.year = body.input_date.getFullYear()
    body.updated_at = new Date()
  })
  static async update(body: Spendings, auth: any) {
    return await SpendingsService.mongo.manual(Spendings, async (collection) => {
      let msgs = []
      msgs.push(`### UPDATE ITEM ###`)
      const oldItem = await SpendingsService.get(body._id, auth)
      if (!oldItem) throw HttpError.NOT_FOUND()
      await collection.update(
        {
          user_id: auth.accountId,
          'spendings._id': body._id
        }, {
          $set: {
            'spendings.$': body
          }
        })
      const newWallet = await WalletService.get(body.wallet_id, auth)
      const newTypeSpending = await TypeSpendingsService.get(body.type_spending_id, auth)
      msgs.push(` - $New: ${newWallet.name} >>> ${newTypeSpending.name} = ${body.type > 0 ? '+' : body.type < 0 ? '-' : ''}${SpendingsService.formatNumber(body.money)} (${body.input_date.getDate()}/${body.input_date.getMonth() + 1}/${body.input_date.getFullYear()})`)

      if (oldItem.wallet_id !== body.wallet_id) {
        const oldWallet = await WalletService.get(oldItem.wallet_id, auth)
        oldWallet.money += oldItem.sign_money * -1
        await WalletService.update(oldWallet, auth)

        const oldTypeSpending = await TypeSpendingsService.get(body.type_spending_id, auth)
        msgs.push(` - $Old: ${oldWallet.name} >>> ${oldTypeSpending.name} = ${oldItem.type > 0 ? '+' : oldItem.type < 0 ? '-' : ''}${SpendingsService.formatNumber(oldItem.money)} (${oldItem.input_date.getDate()}/${oldItem.input_date.getMonth() + 1}/${oldItem.input_date.getFullYear()})`)

        newWallet.money += body.sign_money
        await WalletService.update(newWallet, auth)
      } else if (oldItem.money !== body.money) {
        newWallet.money += body.sign_money - oldItem.sign_money
        await WalletService.update(newWallet, auth)
      }
      if (oldItem.walletGS_id !== body.walletGS_id) {
        if (oldItem.walletGS_id) {
          const oldWallet = await WalletService.get(oldItem.walletGS_id, auth)
          oldWallet.money += oldItem.sign_money * -1
          await WalletService.update(oldWallet, auth)
        }
        if (body.walletGS_id) {
          const newWallet = await WalletService.get(body.walletGS_id, auth)
          newWallet.money += body.sign_money
          await WalletService.update(newWallet, auth)
        }
      } else if (oldItem.money !== body.money && body.walletGS_id) {
        const wallet = await WalletService.get(body.walletGS_id, auth)
        wallet.money += body.sign_money - oldItem.sign_money
        await WalletService.update(wallet, auth)
      }

      if (body.des && body.des.length > 0) msgs.push(`#Note: ${body.des}`)

      await LogService.push({
        type: 'update-spending',
        data: msgs
      }, auth)
      return body
    })
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [, '_id'], Uuid)
  })
  static async delete(_id: Uuid, auth: any) {
    return await SpendingsService.mongo.manual(Spendings, async (collection) => {
      const oldItem = await SpendingsService.get(_id, auth)
      if (!oldItem) throw HttpError.NOT_FOUND()
      await collection.update(
        {
          user_id: auth.accountId
        }, {
          $pull: {
            spendings: {
              _id
            }
          }
        })
      const wallet = await WalletService.get(oldItem.wallet_id, auth)
      if (oldItem.money > 0) {
        wallet.money += oldItem.money * oldItem.type * -1
        await WalletService.update(wallet, auth)

        if (oldItem.walletGS_id) {
          const walletGs = await WalletService.get(oldItem.walletGS_id, auth)
          walletGs.money += oldItem.money * oldItem.type * -1
          await WalletService.update(walletGs, auth)
        }
      }
      let msgs = []
      const typeSpending = await TypeSpendingsService.get(oldItem.type_spending_id, auth)
      msgs.push(`### REMOVE ITEM ###`)
      msgs.push(` - ${wallet.name} >>> ${typeSpending.name} = ${oldItem.type > 0 ? '+' : oldItem.type < 0 ? '-' : ''}${SpendingsService.formatNumber(oldItem.money)} (${oldItem.input_date.getDate()}/${oldItem.input_date.getMonth() + 1}/${oldItem.input_date.getFullYear()})`)
      await LogService.push({
        type: 'delete-spending',
        data: msgs
      }, auth)
      return _id
    })
  }

  public static toUnsign(alias) {
    let str = alias
    str = str.toLowerCase()
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i')
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
    str = str.replace(/đ/g, 'd')
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\|\'|\'|\&|\#|\[|\]|~|$|_/g, '')
    str = str.replace(/-+-/g, '')
    str = str.replace(/^\-+|\-+$/g, '')
    return str
  }

  private static formatNumber(a: number) {
    return a.toFixed(1).replace(/(\d)(?=(\d{3})+\.)/g, '$1,')
  }

}
