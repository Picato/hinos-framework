import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { cors } from 'hinos-cors'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), {
  ignorecase: true,
  root: '/Log',
  onInit(method, path) {
    console.log(`${method.toUpperCase()}\t${path}`)
    AppConfig.routes.push({ method: method.toUpperCase(), path })
  }
}))

Server.listen(AppConfig.port, () => {
  console.info(`
    _     _                 
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\ 
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}
      
  `)
})