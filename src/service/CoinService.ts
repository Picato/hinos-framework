import * as _ from 'lodash'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import { REDIS, Redis } from 'hinos-redis'
import axios from 'axios'
import * as bittrex from 'node-bittrex-api'

/************************************************
 ** ChartService || 4/10/2017, 10:19:24 AM **
 ************************************************/

bittrex.options({
  
  inverse_callback_arguments: true
})

@Collection('coin')
export class Coin {
  _id?: Uuid
  price?: number
  type?: string
  des?: string
  date?: Date
  created_at?: Date
  updated_at?: Date
}

class Bittrex {
  @REDIS()
  static redis: Redis

  static oldCoins = undefined as string[]

  static getCurrencies() {
    return new Promise((resolve, reject) => {
      bittrex.getcurrencies(function (err, data) {
        if (err) return reject(err)
        const coins = data.result.map(e => e.Currency)
        resolve(coins)
      });
    })
  }

  static async getNewCoin() {
    const coins = await Bittrex.getCurrencies() as string[]
    const newCoins = _.difference(coins, Bittrex.oldCoins)
    if (newCoins.length > 0) {
      CoinService.pushMessage(newCoins)
      Bittrex.oldCoins = _.uniq(coins.concat(Bittrex.oldCoins))
      Bittrex.redis.set('bittrex.currencies', JSON.stringify(Bittrex.oldCoins))
    }
    setTimeout(Bittrex.getNewCoin, AppConfig.app.bittrex.scanCurrency)
  }
}

export class CoinService {
  @MONGO()
  static mongo: Mongo

  static pushMessage(coins) {
    axios.post('https://hooks.slack.com/services/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', {
      text: `Have just got new coin is ${coins.join(', ')}`
    }, {
        headers: {
          'content-type': 'application/json'
        }
      })
  }

  static async autoSync() {
    console.log('Auto sync coin')
    Bittrex.oldCoins = JSON.parse(await Bittrex.redis.get('bittrex.currencies') as string || '[]')
    Bittrex.getNewCoin()
  }

}