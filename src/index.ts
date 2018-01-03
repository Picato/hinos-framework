import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
// import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import './config'
// import { GoldService } from './service/GoldService'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)
// Server.use(serve({
//   '/images': path.join(__dirname, '..', 'assets', 'images')
// }))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), { ignorecase: true, root: AppConfig.path }))

Server.listen(AppConfig.port, async () => {
  console.info(`
    _     _
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}

  `)
})

// GoldService.autoSync();

// import './service/Coin/Crawler'
// import './service/Coin/Telegram'