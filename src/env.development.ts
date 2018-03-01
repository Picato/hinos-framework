import * as path from 'path'
import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import { Logger } from "hinos-log/lib/logger";

export default function env(Server) {
  Logger.pool().info('Development mode')
  if (AppConfig.encrypt && AppConfig.encrypt.pwd) Server.use(require('hinos-requesthasher').hasher(AppConfig.encrypt.pwd, AppConfig.encrypt))
  Server.use(cors(AppConfig.cors))
  Server.use(serve({
    [`${AppConfig.path}/upload`]: path.join(__dirname, '..', 'assets', 'upload')
  }))
}
