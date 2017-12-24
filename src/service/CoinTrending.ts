import { REDIS, Redis } from 'hinos-redis/lib/redis';
import { MONGO, Mongo } from 'hinos-mongo/lib/mongo';

/************************************************
 ** ChartService || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class CoinTrending {

  @REDIS()
  static redis: Redis

  @MONGO('coin')
  static mongo: Mongo

  static checking() {
    const now = new Date()
    const period = new Date()
    period.setDate(now.getDate() - 10)

    CoinTrending.mongo.find('BittrexTrading', {
      $where: {
        updated_at: {
          $lt: period
        }
      },
      $sort: {
        updated_at: -1
      }
    })
  }


}