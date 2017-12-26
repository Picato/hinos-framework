// import { REDIS, Redis } from 'hinos-redis/lib/redis';
// import { MONGO, Mongo, Collection, Uuid } from 'hinos-mongo/lib/mongo';
// import { BittrexTrading } from './CoinService';

// /************************************************
//  ** ChartService || 4/10/2017, 10:19:24 AM **
//  ************************************************/

// @Collection('BittrexTrending')
// export class BittrexTrending {
//   _id?: Uuid
//   name: string
//   market: string
//   histories: [{
//     trends: number
//     updated_at?: Date
//   }]
//   updated_at?: Date
// }

// export class CoinTrending {

//   @REDIS()
//   static redis: Redis

//   @MONGO('coin')
//   static mongo: Mongo

//   static async checking() {
//     const now = new Date()
//     const period = new Date()
//     period.setMinutes(now.getMinutes() - 1000)

//     const trading = await CoinTrending.mongo.find<BittrexTrading>(BittrexTrading, {
//       $where: {
//         updated_at: {
//           $gt: period
//         }
//       },
//       $sort: {
//         updated_at: -1
//       },
//       $recordsPerPage: 0
//     })
//     let oldDate
//     let data = []
//     for (const e of trading) {
//       if (oldDate && oldDate !== e.updated_at.getTime()) {
//         break
//       }
//       let cached = {} as any
//       cached.name = e.name
//       cached.market = e.market
//       cached.histories = [] as any
//       cached.last = e.last
//       data.push(cached)
//       if (!oldDate) oldDate = e.updated_at.getTime()
//     }
//     for (const e of trading) {
//       const item = data.find(t => e.name === t.name && e.market === t.market)
//       // item.histories.push({ trends: e.trends, updated_at: e.updated_at })
//       item.updated_at = now
//     }
//     if (data.length > 0) {
//       await CoinTrending.mongo.delete<BittrexTrending>(BittrexTrending, {}, { multiple: true })
//       await CoinTrending.mongo.insert<BittrexTrending>(BittrexTrending, data)
//     }
//     console.log(data)
//   }


// }