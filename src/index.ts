import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import { Socketio } from 'hinos-socketio'
import { ServiceService } from './service/ServiceService'
import { MonitorConfigService } from './service/MonitorConfigService'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Server.use(serve({
  '/images': path.join(__dirname, '..', 'assets', 'images')
}))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), {
  ignorecase: true,
  root: '/Monitor'
}))

Socketio({ server: Server.server })
Socketio.pool().bind('/msg')

Server.listen(AppConfig.port, () => {
  MonitorConfigService.loadConfig().then(() => {
    setTimeout(ServiceService.check, 10000)
  })
  console.info(`
    _     _
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}

  `)
})
