import * as url from 'url'
import * as _ from 'lodash'

declare let global: any

const packageConfig = require('../package.json')
let appconfig = packageConfig.appconfig.reduce((sum, e) => {
  try {
    const [file, root] = e.split('?')
    const c = require(`../${file}`)
    if (root) {
      const m = root.split(',').reduce((sum, e) => {
        e = e.trim()
        const m = e.startsWith('#') ? c[e.substr(1)] : { [e]: c[e] }
        return _.merge(sum, m)
      }, {})
      sum = _.merge(sum, m)
    } else {
      sum = _.merge(sum, c)
    }
  } catch (e) {
    console.error(e)
  }
  return sum
}, {})
appconfig.name = packageConfig.name

const urlApp = url.parse(appconfig.url)
appconfig.port = +urlApp.port
appconfig.host = urlApp.host

global.AppConfig = appconfig
