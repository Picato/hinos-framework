import * as path from 'path'
import { serve } from 'hinos-serve'

export default function env(Server) {
  console.log('Development mode')
  if (AppConfig.encrypt && AppConfig.encrypt.pwd) Server.use(require('hinos-requesthasher').hasher(AppConfig.encrypt.pwd, AppConfig.encrypt))
  Server.use(serve({
    [`${AppConfig.path}/upload`]: path.join(__dirname, '..', 'assets', 'upload')
  }))
}
