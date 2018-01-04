import { TrendsMessageService, TrendsMessage } from "./TrendsMessage";
import { Event } from "../Event";
import BittrexApi from "../Bittrex/BittrexApi";

// import { REDIS, Redis } from "hinos-redis/lib/redis";

class TrendsMin1 {
  // @REDIS()
  // private static redis: Redis

  async init() {
    const self = this
    Event.HandlerMin.on(`updateData#HandlerMin1`, async (data) => {
      console.log('#Trends HandlerMin1')
      let tmp = await Promise.all([
        self.topVolumeChanging(data),
        self.topPercentChanging(data)
      ])
      const msgs = tmp.reduce((sum: any[], msgs: any[]) => sum.concat(msgs), [])
      if (msgs.length > 0) {
        await TrendsMessageService.insert(msgs, 'HandlerMin1')
      }
    })
  }

  async topVolumeChanging(data) {
    const maxVolume = data
      .sort((a, b) => (b.baseVolumePercent > 0 ? b.baseVolumePercent : (b.baseVolumePercent * -1)) - (a.baseVolumePercent > 0 ? a.baseVolumePercent : (a.baseVolumePercent * -1)))
      .filter(e => e.baseVolumePercent > 1)
      .slice(0, 6)
    return Promise.resolve(maxVolume.map(e => {
      if (e.baseVolumePercent > 0)
        return { key: e.key, txt: `Thị trường đã được đổ thêm ${BittrexApi.formatNumber(e.baseVolumePercent)}%`, style: 'VOLUME' }
      return { key: e.key, txt: `Thị trường đã bị rút ra ${BittrexApi.formatNumber(e.baseVolumePercent)}%`, style: 'VOLUME' }
    }) as TrendsMessage[])
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
