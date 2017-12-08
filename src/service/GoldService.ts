import * as xml2js from 'xml2js'
import axios from 'axios'
import { REDIS, Redis } from 'hinos-redis/lib/redis';

/************************************************
 ** ChartService || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class GoldService {

  @REDIS()
  static redis: Redis

  static oldSell: number = 0
  static oldBuy: number = 0

  static async autoSync() {
    console.log('Auto sync gold price')

    GoldService.oldSell = +(await GoldService.redis.hget('gold.tempprice', 'old.sell') || '0')
    GoldService.oldBuy = +(await GoldService.redis.hget('gold.tempprice', 'old.buy') || '0')
    GoldService.sync()
  }

  static parseDate(strDate: string): Date {
    const strs = strDate.split(' ')
    const dmy = strs[2].split('/').map((e: any, i) => {
      if (i === 1) e = +e - 1
      return +e
    }).reverse()
    const hms = strs[0].split(':').map((e: any, i) => {
      if (strs[1] === 'PM' && i === 0) {
        e = +e + 12
      }
      return +e
    })
    return new Date(dmy[0], dmy[1], dmy[2], hms[0], hms[1], hms[2])
  }

  static async sync() {
    return new Promise(async (resolve, reject) => {
      const rs = await axios.get('http://www.sjc.com.vn/xml/tygiavang.xml?t=' + new Date().getTime())
      xml2js.parseString(rs.data, async (err, result) => {
        if (err) return reject(err)
        const hn = result.root.ratelist[0].city.find(e => e.$.name === 'Hà Nội')
        const hnDetail: any = hn.item.find(e => e.$.type === 'Vàng SJC').$
        hnDetail.date = GoldService.parseDate(result.root.ratelist[0].$.updated)
        hnDetail.sell = +hnDetail.sell
        hnDetail.buy = +hnDetail.buy
        if (hnDetail.sell !== GoldService.oldSell || hnDetail.buy !== GoldService.oldBuy) {
          // Notify when gold price decrease
          await axios.post('https://hooks.slack.com/services/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', {
            "attachments": [
              {
                "title": `${result.root.ratelist[0].$.updated}`,
                "color": `${hnDetail.sell < GoldService.oldSell ? 'danger' : 'good'}`,
                "fields": [
                  {
                    "title": `Giá mua từ NH >>> ${hnDetail.sell} tr`,
                    "value": `\`${hnDetail.sell > GoldService.oldSell ? '+' : ''}${hnDetail.sell - GoldService.oldSell}\``,
                    "short": true,
                  },
                  {
                    "title": `Giá bán cho NH >>> ${hnDetail.buy} tr`,
                    "value": `\`${hnDetail.buy > GoldService.oldBuy ? '+' : ''}${hnDetail.buy - GoldService.oldBuy}\``,
                    "short": true,
                  }
                ],
                mrkdwn_in: ["fields"]
              }
            ]
          })
          GoldService.oldSell = hnDetail.sell
          GoldService.oldBuy = hnDetail.buy
          await GoldService.redis.hset('gold.tempprice', {
            'old.sell': GoldService.oldSell.toString(),
            'old.buy': GoldService.oldBuy.toString()
          })
          // GoldService.insert(hnDetail)
        }
        resolve(hnDetail)
        setTimeout(GoldService.sync, AppConfig.app.gold.scanTimeout)
      })
    })
  }

}