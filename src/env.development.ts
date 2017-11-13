export default function env(Server) {
  console.log('Development mode')
  if (AppConfig.encrypt && AppConfig.encrypt.pwd) {
    const { hasher } = require('hinos-requesthasher')
    Server.use(hasher(AppConfig.encrypt.pwd, AppConfig.encrypt))
  }
}
