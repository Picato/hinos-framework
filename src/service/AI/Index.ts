import '../../config'
import { Server } from 'hinos'
import { Redis } from 'hinos-redis'
import Logger from '../../common/Logger';

require(`../../env.${Server.env}`).default(Server)

Redis(AppConfig.redis)

Logger.log('---------------- SETUP AI BOT ----------------')

import { User } from "../User";
import { PDumping } from "./PDumping";

(async () => {
  await Promise.all([
    User.init(),
    PDumping.init()
  ])
  Redis.subscribe('updateData', async (data) => {
    let { tradings, now } = JSON.parse(data)
    now = new Date(now)
    await Promise.all([
      PDumping.handleDumpPump(tradings)
    ])
  }, AppConfig.redis)
})()