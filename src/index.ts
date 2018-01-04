import * as path from 'path'
import { Server } from 'hinos'
import { route } from 'hinos-route'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'
// import { serve } from 'hinos-serve'
import { cors } from 'hinos-cors'
import './config'
// import { GoldService } from './service/GoldService'

require(`./env.${Server.env}`).default(Server)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)
// Server.use(serve({
//   '/images': path.join(__dirname, '..', 'assets', 'images')
// }))
Server.use(cors())
Server.use(route(path.join(__dirname, 'controller'), { ignorecase: true, root: AppConfig.path }))

Server.listen(AppConfig.port, async () => {
  console.info(`
    _     _
  | |__ (_)_ __   ___  ___  ${AppConfig.name}
  | '_ \\| | '_ \\ / _ \\/ __|
  | | | | | | | | (_) \\__ \\
  |_| |_|_|_| |_|\\___/|___/ ${AppConfig.port}

  `)
})

// GoldService.autoSync();

// const pub = Redis.newClient(AppConfig.redis)
// const sub = Redis.newClient(AppConfig.redis)

// sub.subscribe("a#123", (err, data) => {
//   console.log("a#123", data)
// })
// sub.subscribe("b#123", (err, data) => {
//   console.log("b#123", data)
// })

// pub.publish("a nice channel", "I am sending a message.")
// pub.publish("b#123", "I am sending a message.")
// pub.publish("a#123", "I am sending a message.")
// import './service/Coin/Crawler/Index'
import './service/Coin/AI/Index'
// import './service/Coin/Telegram/Index'