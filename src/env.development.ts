export default function env(Server) {
  console.log('Development mode')
  if (AppConfig.encrypt && AppConfig.encrypt.pwd) Server.use(require('hinos-requesthasher').hasher(AppConfig.encrypt.pwd, AppConfig.encrypt))
}
