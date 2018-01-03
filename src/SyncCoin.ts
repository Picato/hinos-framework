import './config'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
import { TelegramCommand } from './service/Coin/TelegramCommand'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)

import './service/Coin/StoreTrading'

TelegramCommand.init()