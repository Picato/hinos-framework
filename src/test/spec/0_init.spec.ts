import '../../config'
import { use, expect } from 'chai'
import axios from 'axios'
import { httpMatcher } from '../helpers/http.matcher'
import { Mongo } from 'hinos-mongo'

declare let global: any

global.Axios = axios
global.expect = expect

use(httpMatcher)

before(async function () {
  console.info(`☸ ☸ ☸ ☸ Unit test ☸ ☸ ☸ ☸`)
  Mongo(AppConfig.mongo)

  AppConfig.cuz = {}
  axios.defaults.headers.common['content-type'] = 'application/json'
  // Init something here
})

after(function () {
  console.info(`☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸ ☸`)
})
