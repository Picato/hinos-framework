import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { BODYPARSER } from 'hinos-bodyparser'
import { Mongo } from 'hinos-mongo'
import { Wallet, WalletService } from '../service/WalletService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** WalletController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class WalletController {

  @PUT('/Wallet/Transfer')
  @INJECT(authoriz(`${AppConfig.path}/Wallet`, ['UPDATE']))
  @BODYPARSER()
  @RESTRICT({
    body: {
      des: String,
      from: Mongo.uuid,
      to: Mongo.uuid,
      money: Number,
      input_date: Date
    }
  })
  static async transfer({ params, body, state }) {
    body._id = params._id
    await WalletService.transfer(body, state.auth)
  }

  @GET('/Wallet')
  @INJECT(authoriz(`${AppConfig.path}/Wallet`, ['FIND']))
  @RESTRICT({
    query: {
      type: Number
    }
  })
  static async find({ query, state }) {
    let where: any = {}
    if (query.type !== undefined) where['wallets.type'] = query.type
    const rs: Wallet[] = await WalletService.find({
      $where: where,
      $sort: {
        'wallets.type': -1,
        'wallets.oder': 1,
        'wallets.name': 1
      }
    }, state.auth)
    return rs
  }

  @POST('/Wallet')
  @INJECT(authoriz(`${AppConfig.path}/Wallet`, ['INSERT']))
  @BODYPARSER()
  @RESTRICT({
    body: {
      icon: String,
      name: String,
      money: Number,
      initmoney: Number,
      oder: Number,
      type: Number,
      input_date: Date,
      isApplyToSpending: Boolean,
      des: String
    }
  })
  static async add({ body, state }) {
    const rs: Wallet = await WalletService.insert(body, state.auth, true)
    return rs
  }

  @PUT('/Wallet/reset/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Wallet`, ['UPDATE']))
  @BODYPARSER()
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    },
    query: {
      type: Number
    }
  })
  static async resetInitMoney({ query, params, body, state }) {
    body._id = params._id
    await WalletService.resetInitMoney(query.type, body, state.auth)
  }

  @PUT('/Wallet/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Wallet`, ['UPDATE']))
  @BODYPARSER()
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    },
    body: {
      icon: String,
      name: String,
      money: Number,
      initmoney: Number,
      oder: Number,
      type: Number,
      input_date: Date,
      isApplyToSpending: Boolean,
      des: String
    }
  })
  static async edit({ params, body, state }) {
    body._id = params._id
    await WalletService.update(body, state.auth)
  }

  @DELETE('/Wallet/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Wallet`, ['DELETE']))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await WalletService.delete(params._id, state.auth)
  }

}
