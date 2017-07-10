import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { cors } from 'hinos-cors'
import { serve } from 'hinos-serve'
import { FilesService } from './service/FilesService'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Server.use(serve({
  '/upload': path.join(__dirname, '..', 'assets', 'upload')
}))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), { ignorecase: true }))

Server.listen(AppConfig.port, () => {
  FilesService.syncToRemoveTempFiles()
  console.info(`
    _     _                 
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\ 
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}
      
  `)
})