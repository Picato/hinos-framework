import { GET } from 'hinos-route'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import BittrexApi from '../service/Coin/BittrexApi';
import StoreMin from '../service/Coin/StoreMin';
import StoreHour from '../service/Coin/StoreHour';
import StoreDay from '../service/Coin/StoreDay';
import Trends from '../service/Coin/AI/Trends';

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
    if (query.type === 'min') return StoreMin.newestTrading
    if (query.type === 'hour') return StoreHour.newestTrading
    if (query.type === 'day') return StoreDay.newestTrading
    return BittrexApi.newestTrading
  }

  @GET('/rate')
  static async getRate() {
    return BittrexApi.rate
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
    return query.type === 'day' ? Trends.TrendDaysMsgs : (query.type === 'hour' ? Trends.TrendHoursMsgs : Trends.TrendMinsMsgs)
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