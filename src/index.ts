import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { cors } from 'hinos-cors'
import { MailService } from './service/MailService'
import { Redis } from 'hinos-redis'
import './config'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo).debug(!Server.isProduction)
Redis(AppConfig.redis).debug(!Server.isProduction)

Server.use(cors())
Server.use(route(
  [
    path.join(__dirname, 'controller', 'GlobalController.js'),
    path.join(__dirname, 'controller', 'MailTemplateController.js'),
    path.join(__dirname, 'controller')
  ], { ignorecase: true, root: AppConfig.path }
))

Server.listen(AppConfig.port, () => {
  MailService.loadIntoCached()
  console.info(`
    _     _
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}

  `)
})
// import * as nodemailer from 'nodemailer'

// let transporter = nodemailer.createTransport({
//   host: 'smtp.gmail.com',
//   port: 465,
//   secure: true,
//   auth: {
//     type: 'OAuth2',
//     user: 'thanhdt@viosoft.com',
//     refreshToken: '1/aAIJWUAf5xF8KbOevIZxI022qrk-9MZBt89j2aKhAdo'
//   }
// });
// transporter.sendMail({
//   from: 'thanhdt@viosoft.com',
//   to: 'doanthuanthanh88@gmail.com',
//   subject: 'Message',
//   text: 'I hope this message gets through!'
// }, (error) => {
//   console.log('error', error)
// })