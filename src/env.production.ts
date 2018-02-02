export default function env(Server) {
  console.log('Production mode')
  if (AppConfig.encrypt.helmet) Server.use(require('hinos-helmet').helmet.default())
  if (AppConfig.encrypt && AppConfig.encrypt.pwd) Server.use(require('hinos-requesthasher').hasher(AppConfig.encrypt.pwd, AppConfig.encrypt))
}
