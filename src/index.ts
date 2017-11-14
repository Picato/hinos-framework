import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { cors } from 'hinos-cors'
import { Redis } from 'hinos-redis'
import { Socketio } from 'hinos-socketio'
import { MonitorConfigService } from './service/MonitorConfigService'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo).debug(!Server.isProduction)
Redis(AppConfig.redis).debug(!Server.isProduction)
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), { ignorecase: true, root: AppConfig.path }))

Socketio({
  server: Server.server,
  path: { '/msg': undefined }
}).debug(!Server.isProduction)

Server.listen(AppConfig.port, () => {
  MonitorConfigService.loadConfig()
  console.info(`
    _     _
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}

  `)
})
