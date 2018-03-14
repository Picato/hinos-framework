import { cors } from 'hinos-cors'
import { Logger } from "hinos-log/lib/logger";

export default function env(Server) {
  Logger.pool().info('Development mode')
  Server.use(cors(AppConfig.cors))
}
