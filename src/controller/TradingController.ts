import { GET } from 'hinos-route'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import HandlerMin15 from '../service/Crawler/HandlerMin15'
import HandlerMin3 from '../service/Crawler/HandlerMin3'
import HandlerMin30 from '../service/Crawler/HandlerMin30'
import HandlerHour1 from '../service/Crawler/HandlerHour1'
import HandlerDay1 from '../service/Crawler/HandlerDay1'
import RawTrading from '../service/Crawler/RawHandler'
import HandlerMin1 from '../service/Crawler/HandlerMin1'
import RemitanoHandler from '../service/Crawler/RemitanoHandler';
import { TRACER, TRACE } from 'hinos-log/lib/tracer';

/************************************************
 ** GoldController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class CoinController {

  @GET('/statistic/markets-by-time')
  @RESTRICT({
    params: {
      key: k => k.toUpperCase(),
    },
    query: {
      type: String,
      market: String,
      key: String
    }
  })
  static async getMarketsByTime({ query }) {
    let rs
    let { type, market, key } = query
    // let { key } = params
    if (type === 'HandlerMin30') {
      rs = await HandlerMin30.groupByTime(key, market, 2)
    } else if (type === 'HandlerDay1') {
      rs = await HandlerDay1.groupByTime(key, market, 2)
    }
    return rs
  }

  @TRACE({ type: TRACER.HTTP_REQUEST })
  @GET('/remitano/rate')
  static async getRemitanoRate() {
    return await RemitanoHandler.getRate()
  }

  @GET('/remitano')
  @RESTRICT({
    query: {
      type: String,
      cur: String
    }
  })
  static async getRemitanoPrice({ query }) {
    if (query.type === 'byDay') {
      const now = new Date()
      now.setDate(now.getDate() - 7)
      return await RemitanoHandler.groupByTime(now, {
        _id: {
          day: '$day'
        },
        minAsk: { $min: `$${query.cur}_ask` },
        minBid: { $min: `$${query.cur}_bid` },
        maxAsk: { $max: `$${query.cur}_ask` },
        maxBid: { $max: `$${query.cur}_bid` }
      })
    }
    if (query.type === 'byDate') {
      const now = new Date()
      now.setMonth(now.getMonth() - 1)
      return await RemitanoHandler.groupByTime(now, {
        _id: {
          date: '$date', month: '$month', year: '$year'
        },
        minAsk: { $min: `$${query.cur}_ask` },
        minBid: { $min: `$${query.cur}_bid` },
        maxAsk: { $max: `$${query.cur}_ask` },
        maxBid: { $max: `$${query.cur}_bid` }
      })
    }
    if (query.type === 'byHour') {
      const now = new Date()
      now.setDate(now.getDate() - 1)
      return await RemitanoHandler.groupByTime(now, {
        _id: {
          hours: '$hours'
        },
        minAsk: { $min: `$${query.cur}_ask` },
        minBid: { $min: `$${query.cur}_bid` },
        maxAsk: { $max: `$${query.cur}_ask` },
        maxBid: { $max: `$${query.cur}_bid` }
      })
    }
    return await RemitanoHandler.find({
      $recordsPerPage: 60,
      $sort: {
        time: -1
      }
    })
  }

  @GET('/market/:key')
  @RESTRICT({
    params: {
      key: k => k.toUpperCase(),
    },
    query: {
      type: String
    }
  })
  static async getDetailMarket({ query, params }) {
    let rs
    let { type } = query
    let { key } = params
    if (type === 'HandlerMin1') rs = await HandlerMin1.getTradings()
    else if (type === 'HandlerMin3') rs = await HandlerMin3.getTradings()
    else if (type === 'HandlerMin15') rs = await HandlerMin15.getTradings()
    else if (type === 'HandlerMin30') rs = await HandlerMin30.getTradings()
    else if (type === 'HandlerHour1') rs = await HandlerHour1.getTradings()
    else if (type === 'HandlerDay1') rs = await HandlerDay1.getTradings()
    else rs = await RawTrading.getTradings()
    return rs.find(e => e.key === key)
  }

  @GET('/markets')
  @RESTRICT({
    query: {
      market: String,
      top: String,
      sort: Number,
      type: String,
      page: Number,
      recordsPerPage: Number
    }
  })
  static async getMarket({ query }) {
    let rs
    let { top, sort, type, recordsPerPage = 20, page = 1, market } = query
    if (type === 'HandlerMin1') rs = await HandlerMin1.getTradings()
    else if (type === 'HandlerMin3') rs = await HandlerMin3.getTradings()
    else if (type === 'HandlerMin15') rs = await HandlerMin15.getTradings()
    else if (type === 'HandlerMin30') rs = await HandlerMin30.getTradings()
    else if (type === 'HandlerHour1') rs = await HandlerHour1.getTradings()
    else if (type === 'HandlerDay1') rs = await HandlerDay1.getTradings()
    else rs = await RawTrading.getTradings()
    if (market) rs = rs.filter(e => e.key.indexOf(`${market}-`) === 0)
    if (top) rs.sort((a, b) => sort === -1 ? (b[top] - a[top]) : a[top] - b[top])
    else rs.sort((a, b) => Math.abs(b[top] - a[top]))
    if (recordsPerPage) rs = rs.slice((page - 1) * recordsPerPage, page * recordsPerPage)
    return rs
  }

  @GET('/markets/:coinName')
  @RESTRICT({
    query: {
      type: String
    },
    params: {
      coinName: String
    }
  })
  static async getMarketDetails({ query, params }) {
    if (query.type === 'HandlerMin3') return HandlerMin3.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 50
    })
    if (query.type === 'HandlerMin15') return HandlerMin15.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 50
    })
    if (query.type === 'HandlerMin30') return HandlerMin30.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 50
    })
    if (query.type === 'HandlerHour1') return HandlerHour1.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 50
    })
    if (query.type === 'HandlerDay1') return HandlerDay1.find({
      $where: {
        key: params.coinName.toUpperCase()
      },
      $sort: {
        time: -1
      },
      $recordsPerPage: 50
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
      key: k => k.toUpperCase(),
      type: String
    }
  })
  static async getTrendingMessage({ query }) {
    let where = {
      type: query.type
    } as any
    if (query.key) where.key = query.key
    return []
    // return TrendsMessageService.find(where)
  }

}