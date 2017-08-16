import { helmet } from 'hinos-helmet'

export default function env(Server) {
  console.log('Production mode')
  Server.use(helmet.default())
  if (AppConfig.encrypt && AppConfig.encrypt.pwd) {
    const { hasher } = require('hinos-requesthasher')
    Server.use(hasher(AppConfig.encrypt.pwd, AppConfig.encrypt))
  }
}
