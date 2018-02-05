import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
// import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import { Logger } from 'hinos-log'
import './config'

require(`./env.${Server.env}`).default(Server)

Logger(AppConfig.log)
Mongo(AppConfig.mongo)
Redis(AppConfig.redis)

// Server.use(serve({
//   '/images': path.join(__dirname, '..', 'assets', 'images')
// }))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), { ignorecase: true, root: AppConfig.path }))

Server.listen(AppConfig.port, () => {
  Logger.pool().info(`
    _     _
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}

  `)
})
