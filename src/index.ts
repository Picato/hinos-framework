import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import { MailService } from './service/MailService'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Server.use(serve({
  '/images': path.join(__dirname, '..', 'assets', 'images')
}))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller')))

Server.listen(AppConfig.port, () => {
  MailService.schedule()
  console.info(`
    _     _                 
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\ 
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}
      
  `)
})