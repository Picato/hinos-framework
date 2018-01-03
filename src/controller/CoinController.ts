import { GET } from 'hinos-route'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import HandlerMin5 from '../service/Coin/Crawler/HandlerMin5'
import HandlerMin3 from '../service/Coin/Crawler/HandlerMin3'
import HandlerMin30 from '../service/Coin/Crawler/HandlerMin30'
import HandlerHour1 from '../service/Coin/Crawler/HandlerHour1'
import HandlerDay1 from '../service/Coin/Crawler/HandlerDay1'
import RawTrading from '../service/Coin/Crawler/RawHandler'
import { TrendsMessageService } from '../service/Coin/AI/TrendsMessage';
import HandlerMin1 from '../service/Coin/Crawler/HandlerMin1';

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
    if (query.type === 'min1') rs = await HandlerMin1.getTradings()
    else if (query.type === 'min3') rs = await HandlerMin3.getTradings()
    else if (query.type === 'min5') rs = await HandlerMin5.getTradings()
    else if (query.type === 'min30') rs = await HandlerMin30.getTradings()
    else if (query.type === 'hour') rs = await HandlerHour1.getTradings()
    else if (query.type === 'day') rs = await HandlerDay1.getTradings()
    else rs = await RawTrading.getTradings()
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
    if (query.type === 'min3') return HandlerMin3.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 30
    })
    if (query.type === 'min5') return HandlerMin5.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 30
    })
    if (query.type === 'min30') return HandlerMin30.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 30
    })
    if (query.type === 'hour') return HandlerHour1.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 24
    })
    if (query.type === 'day') return HandlerDay1.find({
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
    return await RawTrading.getRate()
  }

  @GET('/trends')
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getTrends({ }) {
    return []
  }

  @GET('/trending-message')
  @RESTRICT({
    query: {
      type: String
    }
  })
  static async getTrendingMessage({ query }) {
    return TrendsMessageService.find({}, query.type)
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