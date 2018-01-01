import { GET } from 'hinos-route'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import StoreMin from '../service/Coin/StoreMin'
import StoreHour from '../service/Coin/StoreHour'
import StoreDay from '../service/Coin/StoreDay'
import Trends from '../service/Coin/AI/Trends'
import { StoreTrading } from '../service/Coin/StoreTrading'

/************************************************
 ** GoldController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class CoinController {

  @GET('/market')
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getMarket({ query }) {
    let rs
    if (query.type === 'min') rs = await StoreMin.getTradings()
    else if (query.type === 'hour') rs = await StoreHour.getTradings()
    else if (query.type === 'day') rs = await StoreDay.getTradings()
    else rs = await StoreTrading.getTradings()
    return rs.sort((a, b) => Math.abs(b.percent - a.percent))
  }

  @GET('/market/:coinName')
  @RESTRICT({
    query: {
      type: String
    },
    params: {
      coinName: String
    }
  })
  static async getMarketDetails({ query, params }) {
    if (query.type === 'min') return StoreMin.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 30
    })
    if (query.type === 'hour') return StoreHour.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 24
    })
    if (query.type === 'day') return StoreDay.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 14
    })
  }

  @GET('/rate')
  static async getRate() {
    return await StoreTrading.getRate()
  }

  @GET('/trends')
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getTrends({ _query }) {
    return [] // query.type === 'day' ? StoreDay.trending : (query.type === 'hour' ? StoreHour.trending : StoreMin.trending)
  }

  @GET('/trending-message')
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getTrendingMessage({ query }) {
    if (query.type === 'day') return await Trends.getTrendNewsOnDay()
    if (query.type === 'hour') return await Trends.getTrendNewsInHour()
    if (query.type === 'min') return await Trends.getTrendNewsInMinute()
  }

  // @GET('/bittrex-trading')
  // @RESTRICT({
  //   query: {
  //     page: Number,
  //     recordsPerPage: Number,
  //     where: Object,
  //     sort: Object,
  //     fields: Object
  //   }
  // })
  // static async getBittrexTrading({ query }) {
  //   let where: any = Mongo.autocast(query.where || {})
  //   let sort: any = query.sort || { updated_at: -1 }
  //   let fields: any = query.fields || {}

  //   return await CoinService.getBittrexTrading({
  //     $where: where,
  //     $page: query.page,
  //     $recordsPerPage: query.recordsPerPage,
  //     $sort: sort,
  //     $fields: fields
  //   })
  // }

}