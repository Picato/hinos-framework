import '../../../config'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'

require(`../../../env.${Server.env}`)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)

console.log('---------------- SETUP AI ----------------')

import TrendsMin1 from './TrendsMin1'
import TrendsMin3 from './TrendsMin3'
import TrendsMin5 from './TrendsMin5'
import TrendsMin30 from './TrendsMin30'
import TrendsHour1 from './TrendsHour1'
import TrendsDay1 from './TrendsDay1'

Promise.all([
  TrendsMin1.init(),
  TrendsMin3.init(),
  TrendsMin5.init(),
  TrendsMin30.init(),
  TrendsHour1.init(),
  TrendsDay1.init()
])