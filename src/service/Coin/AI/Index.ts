import '../../../config'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'

require(`../../../env.${Server.env}`)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)

console.log('---------------- SETUP AI ----------------')

import BittrexAnalyticsBot from './Telegram/BittrexAnalyticsBot'
import TrendsMin1 from './TrendsMin1'
import TrendsMin3 from './TrendsMin3'
import TrendsMin15 from './TrendsMin15'
import TrendsMin30 from './TrendsMin30'
import TrendsHour1 from './TrendsHour1'
import TrendsDay1 from './TrendsDay1'

Promise.all([
  BittrexAnalyticsBot.init(),
  TrendsMin1.init(),
  TrendsMin3.init(),
  TrendsMin15.init(),
  TrendsMin30.init(),
  TrendsHour1.init(),
  TrendsDay1.init()
])