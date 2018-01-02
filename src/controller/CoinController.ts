import { GET } from 'hinos-route'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import StoreMin5 from '../service/Coin/StoreMin5'
import StoreMin3 from '../service/Coin/StoreMin3'
import StoreMin30 from '../service/Coin/StoreMin30'
import StoreHour from '../service/Coin/StoreHour'
import StoreDay from '../service/Coin/StoreDay'
import Trends from '../service/Coin/AI/Trends'
import { StoreTrading } from '../service/Coin/StoreTrading'
import TrendsMin3 from '../service/Coin/AI/TrendsMin3';
import { TrendingMessage } from '../service/Coin/TrendingMessage';
import { TrendsMessageService } from '../service/Coin/AI/TrendsMessage';

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
    if (query.type === 'min3') rs = await StoreMin3.getTradings()
    else if (query.type === 'min5') rs = await StoreMin5.getTradings()
    else if (query.type === 'min30') rs = await StoreMin30.getTradings()
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
    if (query.type === 'min3') return StoreMin3.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 30
    })
    if (query.type === 'min5') return StoreMin5.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 30
    })
    if (query.type === 'min30') return StoreMin30.find({
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
      $recordsPerPage: 31
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
  static async getTrends({ query }) {
    return []
  }

  @GET('/trending-message')
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getTrendingMessage({ query }) {
    if (query.type === 'min3') return TrendsMessageService.find({}, query.type)
    return []
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