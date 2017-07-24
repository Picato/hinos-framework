import * as fs from 'fs'
import * as url from 'url'
import * as _ from 'lodash'

declare let global: any

const packageConfig = require('../package.json')
const appconfig: IAppConfig = _.merge({}, packageConfig.config, {
  name: packageConfig.name
})

if (appconfig.externalConfig) {
  const [externalFile, externalGroup] = appconfig.externalConfig.split('#')
  if (fs.existsSync(externalFile)) {
    let content: string = fs.readFileSync(externalFile).toString()
    let line: Array<string> = content.replace(/\r/g, '').split('\n').filter((e) => {
      return e.trim().length > 0
    })
    let key
    let config: any = {}
    let loadNewVar = (vl, str, svl) => {
      if (str.indexOf('.') !== -1) {
        let k = str.substr(0, str.indexOf('.'))
        str = str.substr(str.indexOf('.') + 1)
        if (!vl[k]) vl[k] = {}
        vl[k] = loadNewVar(vl[k], str, svl)
      } else {
        let re = /\$\{\[([^\]]+)\]([^}]+)?\}/g
        let m = re.exec(svl)
        while (m !== null) {
          /* tslint:disable */
          if (!m[2]) {
            svl = eval(`config['${m[1]}']`)
          } else {
            svl = svl.replace(`\$\{\[${m[1]}\]${m[2]}\}`, eval(`config['${m[1]}']${m[2]}`))
          }
          /* tslint:enable */
          m = re.exec(svl)
        }
        vl[str] = svl
      }
      return vl
    }
    for (let l of line) {
      let m = l.match(/^\[([a-zA-Z0-9\.-_]+)\][\s\r\t]*$/)
      if (m) {
        key = m[1]
        config[key] = {}
        continue
      }
      let k = l.substr(0, l.indexOf('='))
      let v: any = l.substr(l.indexOf('=') + 1)
      if (v.indexOf('+') === 0) v = +v
      config[key] = loadNewVar(config[key], k, v)
    }
    _.merge(appconfig, config[externalGroup])
  }
}
const urlApp = url.parse(appconfig.url)
appconfig.port = +urlApp.port
appconfig.host = urlApp.host

global.AppConfig = appconfig
