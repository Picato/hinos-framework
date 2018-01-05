import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { TradingHour } from "../Crawler/AbsHandlerHour";
import { TrendsCommon } from "./TrendsCommon";
import { TrendsMessageService } from "./TrendsMessage";
import { Redis } from "hinos-redis/lib/redis";

export default class AbsTrendsHour extends TrendsCommon {
  @MONGO('coin')
  protected mongo: Mongo

  constructor(protected tblName: string) {
    super()
  }

  async init() {
    const self = this
    Redis.subscribe(`updateData#${self.tblName}`, async () => {
      console.log(`#Trends ${self.tblName}`)
      let beforeThat = new Date()
      beforeThat.setHours(beforeThat.getHours() - 30)
      const data = await self.mongo.find<TradingHour>(self.tblName, {
        $where: {
          time: {
            $gte: beforeThat
          }
        },
        $recordsPerPage: 0,
        $fields: { _id: 1, name: 1, market: 1, key: 1, last: 1, percent: 1, time: 1, prev: 1, candlePrev: 1, candlePercent: 1, candleLast: 1, baseVolumePercent: 1 },
        $sort: {
          key: 1,
          time: -1
        }
      })
      const tradings = {} as { [key: string]: any[] }
      data.forEach(e => {
        if (!tradings[e.key]) tradings[e.key] = []
        tradings[e.key].push(e)
      })
      let msgs = []
      for (let key in tradings) {
        const items = tradings[key]
        let allmsgs = await Promise.all([
          this.check55Percent(key, items[0]),
          this.checkRecentlySame(key, items),
          this.checkBaseVolume(key, items)
        ]) as any[]
        msgs = msgs.concat(allmsgs.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), []))
      }
      if (msgs.length > 0) {
        await TrendsMessageService.insert(msgs, `${this.tblName}`)
      }
    }, AppConfig.redis)
  }
}