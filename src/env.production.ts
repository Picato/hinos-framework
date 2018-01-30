import { config } from "./common/Logger";

export default function env(Server) {
  console.log('Production mode')
  config({
    appenders: { [AppConfig.name]: { type: 'file', filename: `${AppConfig.name}.log` } },
    categories: { default: { appenders: [`${AppConfig.name}`], level: 'error' } }
  })
  if (AppConfig.encrypt.helmet) Server.use(require('hinos-helmet').helmet.default())
  if (AppConfig.encrypt && AppConfig.encrypt.pwd) Server.use(require('hinos-requesthasher').hasher(AppConfig.encrypt.pwd, AppConfig.encrypt))
}
