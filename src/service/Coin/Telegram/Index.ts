import './config'
import { Server } from 'hinos'
import { Redis } from 'hinos-redis'

require(`./env.${Server.env}`)

Redis(AppConfig.redis)

import TelegramCommand from './TelegramCommand'

TelegramCommand.init()
