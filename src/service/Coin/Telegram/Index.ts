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
import { BittrexAlertPumpDump } from './BittrexAlertPumpDump';
import { Cached } from './Cached';

(async () => {
  await Promise.all([
    Cached.init(),
    BittrexCommand.init(),
    BittrexUser.init(),
    BittrexOrder.init(),
    BittrexWatcher.init(),
    BittrexAlert.init(),
    BittrexAlertPumpDump.init()
  ])
  Redis.subscribe('updateData', async (data) => {
    const { tradings } = JSON.parse(data)
    await Cached.reload()
    await Promise.all([
      BittrexAlert.runBackground(tradings),
      BittrexWatcher.runBackground(tradings),
      BittrexOrder.runBackground(tradings),
      BittrexAlertPumpDump.runBackground(tradings)
    ])
  }, AppConfig.redis)

})()
