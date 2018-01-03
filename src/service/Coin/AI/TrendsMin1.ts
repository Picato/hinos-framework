import { BittrexMin1Trading } from "../StoreMin1";
import { TrendsMessageService, TrendsMessage } from "./TrendsMessage";

// import { REDIS, Redis } from "hinos-redis/lib/redis";

export default class TrendsMin1 {
  // @REDIS()
  // private static redis: Redis

  static async execute(data: BittrexMin1Trading[]) {
    let msgs = []
    let maxPercent = data
      .sort((a, b) => (b.percent > 0 ? b.percent : (b.percent * -1)) - (a.percent > 0 ? a.percent : (a.percent * -1)))
      .filter(e => e.percent > 2)
      .slice(0, 6)
    msgs = msgs.concat(maxPercent.map(e => {
      return { key: e.key, txt: `Đang ${e.percent > 0 ? 'tăng' : 'giảm'} ${e.percent}%` }
    }) as TrendsMessage[])


    const maxVolume = data
      .sort((a, b) => (b.baseVolumePercent > 0 ? b.baseVolumePercent : (b.baseVolumePercent * -1)) - (a.baseVolumePercent > 0 ? a.baseVolumePercent : (a.baseVolumePercent * -1)))
      .filter(e => e.percent > 0)
      .slice(0, 6)
    msgs = msgs.concat(maxVolume.map(e => {
      if (e.baseVolumePercent > 0)
        return { key: e.key, txt: `Thị trường đã được đổ thêm ${e.baseVolumePercent}%`, style: 'VOLUME' }
      return { key: e.key, txt: `Thị trường đã bị rút ra ${e.baseVolumePercent}%`, style: 'VOLUME' }
    }) as TrendsMessage[])

    if (msgs.length > 0) await TrendsMessageService.insert(msgs, 'min1')
  }
}