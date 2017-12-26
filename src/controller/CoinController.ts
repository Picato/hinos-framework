import { GET } from 'hinos-route'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import BittrexApi from '../service/Coin/BittrexApi';
import StoreMin from '../service/Coin/StoreMin';

/************************************************
 ** GoldController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class CoinController {

  @GET('/market')
  static async getMarket() {
    return BittrexApi.newestTrading
  }

  @GET('/rate')
  static async getRate() {
    return BittrexApi.rate
  }

  @GET('/trends-min')
  static async getTrendsMin() {
    return StoreMin.trendsMin
  }

  @GET('/trends-min/:key')
  @RESTRICT({
    params: {
      key: String
    }
  })
  static async getTrendsMinHistory({ params }) {
    return StoreMin.trendsMin.find(e => e.key = params.key)
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