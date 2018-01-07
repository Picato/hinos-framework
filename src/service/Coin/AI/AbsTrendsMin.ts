import { MONGO, Mongo } from "hinos-mongo/lib/mongo"
import { TradingMin } from "../Crawler/AbsHandlerMin";
import { TrendsCommon } from "./TrendsCommon";
import { TrendsMessageService } from "./TrendsMessage";
import { Redis } from "hinos-redis/lib/redis";

export default class AbsTrendsMin extends TrendsCommon {
  @MONGO('coin')
  protected mongo: Mongo

  constructor(protected tblName: string) {
    super()
  }

  public async init() {
    const self = this
    Redis.subscribe(`updateData#${self.tblName}`, async () => {
      console.log(`#Trends ${self.tblName}`)
      let beforeThat = new Date()
      beforeThat.setMinutes(beforeThat.getMinutes() - 30)
      const data = await self.mongo.find<TradingMin>(self.tblName, {
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
          self.check55Percent(key, items[0]),
          self.checkRecentlySame(key, items),
          self.checkBaseVolume(key, items)
        ]) as any[]
        msgs = msgs.concat(allmsgs.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), []))
      }
      if (msgs.length > 0) {
        await TrendsMessageService.insert(msgs, `${self.tblName}`)
      }
    }, AppConfig.redis)
  }
}