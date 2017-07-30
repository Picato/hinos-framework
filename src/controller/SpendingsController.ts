import { GET, POST, PUT, DELETE, INJECT, HEAD } from 'hinos-route'
import { MATCHER } from 'hinos-requestmatcher'
import { BODYPARSER } from 'hinos-bodyparser'
import { Mongo } from 'hinos-mongo'
import { Spendings, SpendingsService } from '../service/SpendingsService'
import { authoriz } from '../service/Authoriz'
import { WalletService } from '../service/WalletService'
import { TypeSpendingsService } from '../service/TypeSpendingsService'
import HttpError from '../common/HttpError'
import { merge } from '../service/Merge'

/************************************************
 ** SpendingsController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class SpendingsController {

  @HEAD('/adsense')
  static async getAdsense() {
    throw HttpError.NOT_FOUND()
  }

  @PUT('/Sync/:email')
  @INJECT(authoriz(`${AppConfig.name}>Common`, ['SYNC']))
  @BODYPARSER()
  @MATCHER({
    query: {
      changeToNewServer: Boolean
    },
    params: {
      email: String
    },
    body: {
      isnew: Boolean
    }
  })
  static async syncOldData({ query, params, body, state }) {
    if (query.changeToNewServer) {
      
      return 'Synced to new'
    }
    if (body.isnew) {
      let wallets = await WalletService.find({ $where: {}, $sort: { 'wallets._id': 1 } }, state.auth)
      if (wallets.length === 0) {
        let typeSpendings = await TypeSpendingsService.find({ $where: {}, $sort: { 'type_spendings._id': 1 } }, state.auth)
        if (typeSpendings.length === 0) {
          let spendings = await SpendingsService.find({ $where: {}, $sort: { 'spendings._id': 1 } }, state.auth)
          if (spendings.length === 0) {
            if (await merge(params.email, state.auth)) {
              return 'Synced'
            } else {
              await SpendingsService.createUser(state.auth)
              await WalletService.createDefaultData(state.auth)
              await TypeSpendingsService.createDefaultData(state.auth)
              return 'Created'
            }
          }
        }
      }
    }
    return 'Do nothing'
  }

  @GET('/StatisticByMonth')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['STATISTIC_BY_MONTH']))
  @MATCHER({
    query: {
      startDate: Date,
      endDate: Date
    }
  })
  static async getStatisticByMonth({ query, state }) {
    let where: any = {
      'spendings.sign_money': {
        $ne: 0
      }
    }
    where['spendings.type'] = { $ne: 0 }
    if (query.startDate || query.endDate) {
      where['spendings.input_date'] = {}
      if (query.startDate) where['spendings.input_date']['$gte'] = query.startDate
      if (query.endDate) where['spendings.input_date']['$lte'] = query.endDate
    }
    const rs = await SpendingsService.statisticByMonth(where, state.auth)
    return rs
  }

  @GET('/StatisticByTypeSpending')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['STATISTIC_BY_TYPE_SPENDING']))
  @MATCHER({
    query: {
      type: Number,
      startDate: Date,
      endDate: Date
    }
  })
  static async getStatisticByTypeSpending({ query, state }) {
    let where: any = {
      'spendings.sign_money': {
        $ne: 0
      }
    }
    if (query.type !== undefined) where['spendings.type'] = query.type
    else where['spendings.type'] = { $ne: 0 }
    if (query.startDate || query.endDate) {
      where['spendings.input_date'] = {}
      if (query.startDate) where['spendings.input_date']['$gte'] = query.startDate
      if (query.endDate) where['spendings.input_date']['$lte'] = query.endDate
    }
    const rs = await SpendingsService.statisticByTypeSpending(where, state.auth)
    return rs
  }

  @GET('/Spendings/Suggestion')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['SUGGESTION']))
  static async getSuggestion({ state }) {
    const rs = await SpendingsService.getSuggestion(state.auth)
    return rs
  }

  @GET('/Spendings/Bookmark')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['BOOKMARK']))
  static async getBookmark({
		state
	}) {
    let where = {
      'spendings.is_bookmark': true
    }
    const rs = await SpendingsService.find({
      $where: where,
      $sort: {
        input_date: 1
      }
    }, state.auth)
    return rs
  }

  @GET('/Spendings')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['FIND']))
  @MATCHER({
    query: {
      startDate: Date,
      endDate: Date,
      typeSpendingId: Mongo.uuid,
      walletId: Mongo.uuid
    }
  })
  static async find({ query, state }) {
    let where = {}
    if (query.walletId) where['spendings.wallet_id'] = query.walletId
    if (query.typeSpendingId) where['spendings.type_spending_id'] = query.typeSpendingId
    if (query.startDate || query.endDate) {
      where['spendings.input_date'] = {}
      if (query.startDate) where['spendings.input_date']['$gte'] = query.startDate
      if (query.endDate) where['spendings.input_date']['$lte'] = query.endDate
    }
    const rs = await SpendingsService.find({
      $where: where,
      $sort: {
        input_date: -1
      }
    }, state.auth)
    return rs
  }

  // @GET('/Spendings/:_id', {
  // 	$params: {
  // 		_id: Mongo.uuid
  // 	}
  // })
  // @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['GET']))
  // static async get({
  // 	params, state
  // }) {
  // 	const rs: Spendings = await SpendingsService.get(params._id, state.auth)
  // 	return rs
  // }

  @POST('/Spendings')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['INSERT']))
  @BODYPARSER()
  @MATCHER({
    body: {
      money: Number,
      input_date: Date,
      des: String,
      wallet_id: Mongo.uuid,
      type_spending_id: Mongo.uuid,
      is_bookmark: Boolean,
      type: Number
    }
  })
  static async add({ body, state }) {
    const rs: Spendings = await SpendingsService.insert(body, state.auth, true)
    return rs
  }

  @PUT('/Spendings/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
    params: {
      _id: Mongo.uuid
    },
    body: {
      money: Number,
      input_date: Date,
      des: String,
      wallet_id: Mongo.uuid,
      type_spending_id: Mongo.uuid,
      is_bookmark: Boolean,
      type: Number
    }
  })
  static async edit({ params, body, state }) {
    body._id = params._id
    await SpendingsService.update(body, state.auth)
  }

  @DELETE('/Spendings/Bookmark/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['UNBOOKMARK']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async delBookmark({ params, state }) {
    await SpendingsService.unbookmark(params._id, state.auth)
  }

  @DELETE('/Spendings/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Spendings`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await SpendingsService.delete(params._id, state.auth)
  }
}
