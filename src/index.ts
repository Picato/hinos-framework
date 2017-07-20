import * as path from 'path'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { route } from 'hinos-route'
import { cors } from 'hinos-cors'
import { GatewayService } from './service/GatewayService'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)

Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), {
  ignorecase: true,
  autoSort: false
}))

Server.listen(AppConfig.port, () => {
  GatewayService.loadGateway()
  console.info(`
    _     _                 
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\ 
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}
      
  `)
})