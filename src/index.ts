import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
import { cors } from 'hinos-cors'
import './config'

import startup from "./service/_StartupService"

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)
Server.use(cors({
  exposeHeaders: ['token', 'project_id', 'account_id']
}))
Server.use(route(path.join(__dirname, 'controller'), { ignorecase: true }))

Server.listen(AppConfig.port, async () => {
  await startup()
  console.info(`
    _     _                 
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\ 
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}
      
  `)
})
