import '../../config'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
import Logger from '../../common/Logger';

require(`../../env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)

Logger.log('---------------- SETUP MAIN CRAWLER ----------------')

import RawTrading from "./RawHandler";
import RemitanoHandler from "./RemitanoHandler";

(async () => {
  await Promise.all([
    RawTrading.init(),
    RemitanoHandler.init()
  ])
})()