import '../../config'
import { Server } from 'hinos'
import { Redis } from 'hinos-redis'
import { Logger } from 'hinos-log/lib/logger';

require(`../../env.${Server.env}`).default(Server)

Redis(AppConfig.redis)

Logger.pool().info('---------------- SETUP TELEGRAM BOT ----------------')

import OrderCommand from "./OrderCommand";
import { User } from "../User";
import AlertCommand from "./AlertCommand";
import MenuCommand from "./MenuCommand";

(async () => {
  await Promise.all([
    User.init(),
    MenuCommand.init(),
    OrderCommand.init(),
    AlertCommand.init()
  ])
  await Promise.all([
    OrderCommand.runBackground(),
    AlertCommand.runBackground()
  ])
})()