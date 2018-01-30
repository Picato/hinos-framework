import { Uuid } from 'hinos-mongo'

export class BittrexTrading {
  _id?: Uuid
  key: string
  time: Date
  prev: number
  last: number
  num: number // last-prev
  percent: number
  baseVolume: number
  prevBaseVolume: number
  baseVolumeNum: number
  baseVolumePercent: number
  candlePercent: number
  candlePrev: number
  candleLast: number
}