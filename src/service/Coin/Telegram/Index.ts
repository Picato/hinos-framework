import '../../../config'
import { Server } from 'hinos'
import { Redis } from 'hinos-redis'

require(`../../../env.${Server.env}`)

Redis(AppConfig.redis)

console.log('---------------- SETUP TELEGRAM BOT ----------------')

import BittrexVNBot from './BittrexVNBot'
import BittrexCoinWatcher from '../Bittrex/BittrexCoinWatcher'
import BittrexAlert from '../Bittrex/BittrexAlert'
import BittrexUser from '../Bittrex/BittrexUser';
import BittrexOrder from '../Bittrex/BittrexOrder';

BittrexVNBot.init()
BittrexUser.init(),
BittrexOrder.init()
BittrexCoinWatcher.init()
BittrexAlert.init()