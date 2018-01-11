import { TrendsMessageService, TrendsMessage } from "./TrendsMessage";
import BittrexApi from "../Bittrex/BittrexApi";
import { Redis } from "hinos-redis/lib/redis";
import HandlerMin1 from "../Crawler/HandlerMin1";

// import { REDIS, Redis } from "hinos-redis/lib/redis";

class TrendsMin1 {
  // @REDIS()
  // private static redis: Redis

  private cached = {} as {
    [key: string]: {
      topVolumeChanging: any,
      topPercentChanging: any
    }
  }

  async init() {
    const self = this
    Redis.subscribe('updateData#HandlerMin1', async () => {
      console.log('#Trends HandlerMin1')
      const data = await HandlerMin1.getTradings()
      let tmp = await Promise.all([
        self.topVolumeChanging(data),
        self.topPercentChanging(data)
      ])
      const msgs = tmp.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), [])
      if (msgs.length > 0) {
        await TrendsMessageService.insert(msgs, 'HandlerMin1')
      }
    }, AppConfig.redis)
  }

  async topVolumeChanging(data) {
    const self = this
    const maxVolume = data
      .sort((a, b) => (b.baseVolumePercent > 0 ? b.baseVolumePercent : (b.baseVolumePercent * -1)) - (a.baseVolumePercent > 0 ? a.baseVolumePercent : (a.baseVolumePercent * -1)))
      .filter(e => e.baseVolumePercent > 1)
      .slice(0, 6)
    return Promise.resolve(maxVolume.map(e => {
      if (!self.cached[e.key]) self.cached[e.key] = {} as any
      if (!self.cached[e.key].topVolumeChanging) self.cached[e.key].topVolumeChanging = { total: 0, count: 0 }
      const curSign = e.baseVolumePercent >= 0 ? 1 : -1
      if (!self.cached[e.key].topVolumeChanging.sign) {
        if (curSign !== self.cached[e.key].topVolumeChanging.sign) {
          self.cached[e.key].topVolumeChanging.sign = curSign
          self.cached[e.key].topVolumeChanging.total = 0
          self.cached[e.key].topVolumeChanging.count = 0
        }
      }
      self.cached[e.key].topVolumeChanging.count++
      self.cached[e.key].topVolumeChanging.total += e.baseVolumePercent
      if (self.cached[e.key].topVolumeChanging.count > 1) {
        if (curSign > 0)
          return { key: e.key, txt: `[Liên tục ${self.cached[e.key].topVolumeChanging.count} lần} tăng ${self.cached[e.key].topVolumeChanging.total}%]. Thị trường đã được đổ thêm ${BittrexApi.formatNumber(e.baseVolumePercent)}%`, style: 'VOLUME' }
        return { key: e.key, txt: `[Liên tục ${self.cached[e.key].topVolumeChanging.count} lần} giảm ${self.cached[e.key].topVolumeChanging.total}%] Thị trường đã bị rút ra ${BittrexApi.formatNumber(e.baseVolumePercent)}%`, style: 'VOLUME' }
      }
      return undefined
    }).filter(e => e) as TrendsMessage[])
  }

  async topPercentChanging(data) {
    let maxPercent = data
      .sort((a, b) => (b.percent > 0 ? b.percent : (b.percent * -1)) - (a.percent > 0 ? a.percent : (a.percent * -1)))
      .filter(e => e.percent > 2)
      .slice(0, 6)
    return Promise.resolve(maxPercent.map(e => {
      return { key: e.key, txt: `Vừa ${e.percent > 0 ? 'tăng' : 'giảm'} ${BittrexApi.formatNumber(e.percent)}% trong candle vừa rồi` }
    }) as TrendsMessage[])
  }
}

export default new TrendsMin1()
