import * as path from 'path'
import { Server } from 'hinos'
import { serve } from 'hinos-serve'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { cors } from 'hinos-cors'
import { MailService } from './service/MailService'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo).debug(!Server.isProduction)

Server.use(serve({
  [`${AppConfig.path}/assets`]: path.join(__dirname, '..', 'assets')
}))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), {
  ignorecase: true,
  root: AppConfig.path
}))

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
