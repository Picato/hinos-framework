import * as path from 'path'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { route } from 'hinos-route'
import { cors } from 'hinos-cors'
import * as httpProxy from 'http-proxy'
import { GatewayService } from './service/GatewayService'
import * as querystring from 'querystring'
import './config'

require(`./env.${Server.env}`).default(Server)

AppConfig.proxy = new httpProxy.createProxyServer({
  ws: true
})
Mongo(AppConfig.mongo).debug(!Server.isProduction)

Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), {
  ignorecase: true,
  autoSort: false
}))
// For websocket with request querystring name is root path of service
Server.server.on('upgrade', function (req, res) {
  const query = querystring.parse(req.url.split('?')[1])
  AppConfig.proxy.ws(req, res, { target: AppConfig.app.gateway[query.name.toLowerCase()] })
})
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
