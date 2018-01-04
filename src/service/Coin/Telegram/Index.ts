import '../../../config'
import { Server } from 'hinos'
import { Redis } from 'hinos-redis'

require(`../../../env.${Server.env}`)

Redis(AppConfig.redis)

console.log('---------------- SETUP TELEGRAM BOT ----------------')

import BittrexVNBot from './BittrexVNBot'
import BittrexAnalyticsBot from './BittrexAnalyticsBot'

BittrexVNBot.init()
BittrexAnalyticsBot.init()
