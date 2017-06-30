import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import './config'

import startup from "./service/_StartupService"

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)
Server.use(serve({
  '/images': path.join(__dirname, '..', 'assets', 'images')
}))
Server.use(cors({
  exposeHeaders: ['token']
}))
Server.use(route(path.join(__dirname, 'controller')))

Server.listen(AppConfig.port, async () => {
  await startup()
  console.info(`
       _     _                 
      | |__ (_)_ __   ___  ___  ${AppConfig.port} 
      | '_ \\| | '_ \\ / _ \\/ __|
      | | | | | | | | (_) \\__ \\
      |_| |_|_|_| |_|\\___/|___/
      
  `)
})
