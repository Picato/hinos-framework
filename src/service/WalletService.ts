import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { Mongo, Uuid, Collection, MONGO } from 'hinos-mongo'
import { TypeSpendingsService } from './TypeSpendingsService'
import { SpendingsService } from './SpendingsService'
import HttpError from '../common/HttpError'
import { LogService } from './LogService'

/************************************************
 ** WalletService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('ExpensiveNote')
/* tslint:disable */
export class Wallet {
  _id?: Uuid
  icon?: string
  name?: string
  money?: number
  initmoney?: number
  oder?: number
  type?: number
  input_date?: Date
  created_at?: Date
  updated_at?: Date
  des?: string
  isApplyToSpending?: boolean
}
/* tslint:enable */

export class WalletService {

  @MONGO()
  static mongo: Mongo

  static async createDefaultData(auth) {
    let df: Array<any> = [
      { name: 'Ví tiền', icon: [8, 9], type: 1, money: 0, oder: 1 },
      { name: 'ATM', icon: [8, 6], type: 1, money: 0, oder: 2 },
      { name: 'Tạm để giành', icon: [0, 11], type: 0, money: 0, oder: 3 },
      { name: 'Tiền tiết kiệm', icon: [6, 3], type: 0, money: 0, oder: 4 }
    ]
    for (let e of df) {
      e.icon = `-${e.icon[0] * 53}px -${e.icon[1] * 64}px`
      await WalletService.insert(e as Wallet, auth, false)
    }
  }

  static async find(fil: any = {}, auth: any): Promise<Array<Wallet>> {
    const rs = await WalletService.mongo.manual(Wallet, async (collection) => {
      const rs0 = await collection.aggregate([
        { $match: { user_id: auth.accountId } },
        { $unwind: '$wallets' },
        { $project: { _id: 0, 'wallets': 1 } },
        { $match: fil.$where },
        { $sort: fil.$sort }
      ], { allowDiskUse: true })
      const rs = await rs0.toArray()
      return rs.map(e => e.wallets)
    })
    return rs
  }

  static async get(_id: Uuid, auth: any): Promise<Wallet> {
    const rs = await WalletService.mongo.manual(Wallet, async (collection) => {
      const rs = await collection.findOne({
        user_id: auth.accountId,
        'wallets._id': _id
      }, { fields: { 'wallets.$': 1, _id: 0 } })
      return (rs && rs.wallets && rs.wallets.length === 1) ? rs.wallets[0] : null
    })
    return rs
  }

  @VALIDATE((body: Wallet) => {
    body._id = Mongo.uuid() as Uuid
    Checker.option(body, 'icon', String)
    Checker.required(body, 'name', String)
    Checker.required(body, 'money', Number)
    Checker.option(body, 'initmoney', Number)
    Checker.option(body, 'oder', Number, 1)
    Checker.required(body, 'type', Number)
    Checker.option(body, 'input_date', Date)
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Wallet, auth: any, isAddSpending: boolean) {
    await WalletService.mongo.insert<Wallet>(Wallet, body)
    let timeUpdate = isAddSpending ? _.clone(body.input_date) : null
    const isApplyToSpending = _.clone(body.isApplyToSpending)
    const des = _.clone(body.des)
    delete body.isApplyToSpending
    delete body.des
    return await WalletService.mongo.manual(Wallet, async (collection) => {
      await collection.update({
        user_id: auth.accountId
      }, { $push: { 'wallets': body } })
      if (timeUpdate) {
        const typeSpendings = await TypeSpendingsService.find({
          $where: {
            'type_spendings.name': 'Add new wallet',
            'type_spendings.type': 0
          }, $sort: { _id: 1 }
        }, auth)
        if (typeSpendings.length !== 1) throw HttpError.CONDITION(`Not found typeSpending in ['Add new wallet']`)
        await SpendingsService.insert({
          money: body.money,
          sign_money: isApplyToSpending ? body.money : 0,
          des: des,
          type_spending_id: typeSpendings[0]._id,
          wallet_money0: 0,
          wallet_money1: body.money,
          wallet_id: body._id,
          type: body.money >= 0 ? 1 : -1,
          input_date: timeUpdate,
          date: timeUpdate.getDate(),
          month: timeUpdate.getMonth(),
          year: timeUpdate.getFullYear()
        }, auth, false)
      }
      return body
    })
  }

  @VALIDATE((body: Wallet) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'icon', String)
    Checker.option(body, 'name', String)
    Checker.option(body, 'money', Number)
    Checker.option(body, 'initmoney', Number)
    Checker.option(body, 'oder', Number)
    Checker.option(body, 'type', Number)
    body.updated_at = new Date()
  })
  static async update(body: Wallet, auth: any) {
    let timeUpdate
    if (body.input_date) {
      timeUpdate = _.clone(body.input_date)
      delete body.input_date
    }
    const isApplyToSpending = _.clone(body.isApplyToSpending)
    const des = _.clone(body.des)
    delete body.isApplyToSpending
    delete body.des
    return await WalletService.mongo.manual(Wallet, async (collection) => {
      const old = await WalletService.get(body._id, auth)
      await collection.update({
        user_id: auth.accountId,
        'wallets._id': body._id
      }, { $set: { 'wallets.$': body } })
      if (timeUpdate && body.money !== old.money) {
        const typeSpendings = await TypeSpendingsService.find({
          $where: {
            'type_spendings.name': 'Update wallet',
            'type_spendings.type': 0
          }, $sort: {
            _id: 1
          }
        }, auth)
        if (typeSpendings.length !== 1) throw HttpError.CONDITION(`Not found typeSpending in ['Update wallet']`)
        await SpendingsService.insert({
          money: Math.abs(body.money - old.money),
          sign_money: isApplyToSpending ? (body.money - old.money) : 0,
          des: des,
          type_spending_id: typeSpendings[0]._id,
          wallet_money0: old.money,
          wallet_money1: body.money,
          wallet_id: body._id,
          type: body.money - old.money >= 0 ? 1 : -1,
          input_date: timeUpdate,
          date: timeUpdate.getDate(),
          month: timeUpdate.getMonth(),
          year: timeUpdate.getFullYear()
        }, auth, false)
      }
      return body
    })
  }

  @VALIDATE((type: number, body: Wallet) => {
    Checker.required(body, '_id', Uuid)
    Checker.required(type, [, 'type'], Number)
    body.updated_at = new Date()
  })
  static async resetInitMoney(type: number, body: Wallet, auth: any) {
    return await WalletService.mongo.manual(Wallet, async (collection) => {
      const wallet = await WalletService.get(body._id, auth)

      if (type > 0) body.money += wallet.initmoney || 0
      else if (type < 0) body.money -= wallet.initmoney || 0
      else body.money = wallet.initmoney || 0

      await collection.update({
        user_id: auth.accountId,
        'wallets._id': body._id
      }, { $set: { 'wallets.$': body } })

      let msgs = []
      msgs.push(`### WALLET: RESET INIT MONEY ###`)
      msgs.push(` - ${wallet.name} >>> ${type > 0 ? '+' : type < 0 ? '-' : '='}${SpendingsService.formatNumber(wallet.money)})`)
      await LogService.push({
        type: 'delete-spending',
        data: msgs
      }, auth)

      return body
    })
  }

  @VALIDATE((trans: any) => {
    Checker.required(trans, 'from', Uuid)
    Checker.required(trans, 'to', Uuid)
    Checker.required(trans, 'money', Number)
    Checker.required(trans, 'input_date', Date)
    trans.updated_at = new Date()
  })
  static async transfer(trans: any, auth: any) {
    if (trans.money <= 0) return true
    let fromWallet = await WalletService.get(trans.from, auth)
    if (!fromWallet) throw HttpError.CONDITION('From wallet not found')
    let toWallet = await WalletService.get(trans.to, auth)
    if (!toWallet) throw HttpError.CONDITION('To wallet not found')
    fromWallet.money -= trans.money
    if (trans.money <= 0) throw HttpError.BAD_REQUEST('Need money > 0')
    toWallet.money += trans.money
    const typeSpendings = await TypeSpendingsService.find({
      $where: {
        'type_spendings.name': {
          $in: ['Transfer to wallet', 'Received from wallet']
        },
        'type_spendings.type': 0
      }, $sort: {
        _id: 1
      }
    }, auth)
    if (typeSpendings.length !== 2) throw HttpError.CONDITION(`Not found typeSpending in ['Transfer to wallet', 'Received from wallet']`)
    await WalletService.update(fromWallet, auth)
    await WalletService.update(toWallet, auth)
    await SpendingsService.insert({
      money: trans.money,
      des: trans.des, // `Before ${fromWallet.money + trans.money}. After ${fromWallet.money}`,
      type_spending_id: typeSpendings.find((e) => {
        return e.name === 'Transfer to wallet'
      })._id,
      sign_money: 0,
      wallet_money0: fromWallet.money + trans.money,
      wallet_money1: fromWallet.money,
      wallet_id: fromWallet._id,
      type: -1,
      input_date: trans.input_date,
      date: trans.input_date.getDate(),
      month: trans.input_date.getMonth(),
      year: trans.input_date.getFullYear()
    }, auth, false)
    await SpendingsService.insert({
      money: trans.money,
      sign_money: 0,
      des: trans.des, // `Before ${toWallet.money - trans.money}. After ${toWallet.money}`,
      type_spending_id: typeSpendings.find(e => e.name === 'Received from wallet')._id,
      wallet_money0: toWallet.money - trans.money,
      wallet_money1: toWallet.money,
      wallet_id: toWallet._id,
      type: 1,
      input_date: trans.input_date,
      date: trans.input_date.getDate(),
      month: trans.input_date.getMonth(),
      year: trans.input_date.getFullYear()
    }, auth, false)
  }

  @VALIDATE((_id: Uuid) => {
    Checker.required(_id, [, '_id'], Uuid)
  })
  static async delete(_id: Uuid, auth: any) {
    return await WalletService.mongo.manual(Wallet, async (collection) => {
      const refSpending = await collection.count({
        user_id: auth.accountId,
        'spendings.wallet_id': _id
      })
      if (refSpending > 0) throw HttpError.CONDITION('Some items in spending is using it. Must remove it first')
      await collection.update({ user_id: auth.accountId }, {
        $pull: {
          wallets: { _id }
        }
      })
      return _id
    })
  }
}
