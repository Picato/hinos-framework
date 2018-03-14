import './config'
import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { serve } from 'hinos-serve'
import { Logger } from 'hinos-log'

require(`./env.${Server.env}`).default(Server)

Logger(AppConfig.log)
Mongo(AppConfig.mongo)
Server.use(serve({
  '/images': path.join(__dirname, '..', 'assets', 'images')
}))
Server.use(route(
  [path.join(__dirname, 'controller')],
  {
    ignorecase: true,
    root: AppConfig.path,
    hasher: (AppConfig.encrypt && AppConfig.encrypt.pwd) ? new (require('hinos-requesthasher').Hashers)(AppConfig.encrypt.pwd, AppConfig.encrypt) : undefined
  }
))

Server.listen(AppConfig.port, () => {
  Logger.pool().info(`
    _     _
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}

  `)
})
