import { GET } from 'hinos-route'
import { CoinService } from '../service/CoinService'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'

/************************************************
 ** GoldController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class CoinController {

  @GET('/market')
  static async getMarket() {
    return await CoinService.getMarket();
  }

  @GET('/rate')
  static async getRate() {
    return await CoinService.getRate();
  }

  @GET('/bittrex-trading')
  @RESTRICT({
    query: {
      page: Number,
      recordsPerPage: Number,
      where: Object,
      sort: Object,
      fields: Object
    }
  })
  static async getBittrexTrading({ query }) {
    let where: any = Mongo.autocast(query.where || {})
    let sort: any = query.sort || { updated_at: -1 }
    let fields: any = query.fields || {}

    return await CoinService.getBittrexTrading({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: sort,
      $fields: fields
    })
  }

}