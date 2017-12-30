import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
// import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import './config'
import { StoreTrading } from './service/Coin/StoreTrading';
import { TelegramCommand } from './service/Coin/TelegramCommand';
// import { GoldService } from './service/GoldService';
// import { StoreTrading } from './service/Coin/StoreTrading'
// import { TelegramCommand } from './service/Coin/TelegramCommand'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo).debug(!Server.isProduction)
Redis(AppConfig.redis).debug(!Server.isProduction)
// Server.use(serve({
//   '/images': path.join(__dirname, '..', 'assets', 'images')
// }))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), { ignorecase: true, root: AppConfig.path }))

Server.listen(AppConfig.port, async () => {
  StoreTrading.init()
  TelegramCommand.init()
  console.info(`
    _     _
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}

  `)
})

// GoldService.autoSync();
// CoinService.autoSync()

