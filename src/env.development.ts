export default function env(Server) {
  console.info('Development mode')
  if (AppConfig.encrypt && AppConfig.encrypt.pwd) Server.use(require('hinos-requesthasher').hasher(AppConfig.encrypt.pwd, AppConfig.encrypt))
}
