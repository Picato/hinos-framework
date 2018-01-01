import './config'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
import { StoreTrading } from './service/Coin/StoreTrading'
import { TelegramCommand } from './service/Coin/TelegramCommand'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo).debug(!Server.isProduction)
Redis(AppConfig.redis).debug(!Server.isProduction)

StoreTrading.init()
TelegramCommand.init()