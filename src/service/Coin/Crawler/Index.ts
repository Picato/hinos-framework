import './config'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'

require(`./env.${Server.env}`)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)

// import RawTrading from './RawHandler'
// import HandlerMin1 from './HandlerMin1'
// import HandlerMin3 from './HandlerMin3'
// import HandlerMin5 from './HandlerMin5'
// import HandlerMin30 from './HandlerMin30'
// // import './HandlerHour1'
// // import './HandlerDay1'

// RawTrading.init()
// HandlerMin1.init()
// HandlerMin3.init()
// HandlerMin5.init()
// HandlerMin30.init()