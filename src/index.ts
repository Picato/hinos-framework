import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { cors } from 'hinos-cors'
import './config'

require(`./env.${Server.env}`).default(Server)

Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), { ignorecase: true }))

Server.listen(AppConfig.port, () => {
  console.info(`
    _     _                 
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\ 
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}
      
  `)
})