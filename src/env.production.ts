import { Logger } from "hinos-log/lib/logger";

export default function env(Server) {
  Logger.pool().info('Production mode')
  if (AppConfig.encrypt.helmet) Server.use(require('hinos-helmet').helmet.default())
}
