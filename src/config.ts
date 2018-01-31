import * as url from 'url'
import * as _ from 'lodash'

declare let global: any

const packageConfig = require('../package.json')
const appconfig: IAppConfig = _.merge(require('../appconfig.json'), {
  name: packageConfig.name
})
const urlApp = url.parse(appconfig.url)
appconfig.port = +urlApp.port
appconfig.host = urlApp.host

global.AppConfig = appconfig
