import '../../../config'
import { Server } from 'hinos'
import { Redis } from 'hinos-redis'

require(`../../../env.${Server.env}`)

Redis(AppConfig.redis)

console.log('---------------- SETUP TELEGRAM BOT ----------------')

import BittrexCommand from './BittrexCommand'
import BittrexWatcher from './BittrexWatcher'
import BittrexAlert from './BittrexAlert'
import BittrexUser from './BittrexUser'
import BittrexOrder from './BittrexOrder'

BittrexCommand.init()
BittrexUser.init()
BittrexOrder.init()
BittrexWatcher.init()
BittrexAlert.init()