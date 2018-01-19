import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
// import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import './config'
// import { GoldService } from './service/GoldService'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)

import './Crawler'
