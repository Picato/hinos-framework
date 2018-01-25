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
  async function scanner() {
    const begin = new Date().getTime()
    await Cached.reload()
    try {
      await Promise.all([
        BittrexAlert.runBackground(),
        BittrexWatcher.runBackground(),
        BittrexOrder.runBackground(),
        BittrexAlertPumpDump.runBackground()
      ])
    } catch (e) {
      console.error(e)
    }
    const delay = AppConfig.app.bittrex.scanChecking - (new Date().getTime() - begin)
    setTimeout(scanner, delay < 500 ? 500 : delay)
  }
  await scanner()
})()
