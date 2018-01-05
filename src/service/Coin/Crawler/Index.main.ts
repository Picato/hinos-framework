import '../../../config'
import { Server } from 'hinos'
import { Mongo } from 'hinos-mongo'
import { Redis } from 'hinos-redis'

console.log('---------------- SETUP MAIN CRAWLER ----------------')

require(`../../../env.${Server.env}`)

Mongo(AppConfig.mongo)
Redis(AppConfig.redis)


import RawHandler from "./RawHandler";

RawHandler.init()
