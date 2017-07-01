import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Server.use(serve({
  '/upload': path.join(__dirname, '..', 'assets', 'upload')
}))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller')))

Server.listen(AppConfig.port, () => {
  console.info(`
       _     _                 
      | |__ (_)_ __   ___  ___  ${AppConfig.port} 
      | '_ \\| | '_ \\ / _ \\/ __|
      | | | | | | | | (_) \\__ \\
      |_| |_|_|_| |_|\\___/|___/
      
  `)
})