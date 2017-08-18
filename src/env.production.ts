import { helmet } from 'hinos-helmet'
import { hasher, Config } from 'hinos-requesthasher'

export default function env(Server) {
  console.log('Production mode')
  Server.use(helmet.default())
  hasher(AppConfig.encrypt.pwd, AppConfig.encrypt as Config)
}
