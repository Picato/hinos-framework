import * as _ from 'lodash'
import axios from 'axios'
import { Var, Url } from './Eval'

axios.defaults.headers['content-type'] = 'application/json'

function replaceVars(obj, $var) {
  if (obj === undefined || obj === null) return obj
  if (obj instanceof Array) {
    obj = obj.map(e => replaceVars(e, $var))
  } else if (obj instanceof Url) {
    if (obj.vars && obj.vars.length > 0) {
      let idx = 0
      obj.url = obj.url.replace(/:([A-Za-z0-9_]+)/g, (_all, _m) => {
        try {
          // tslint:disable-next-line:no-eval
          return replaceVars(obj.vars[idx++], $var)
        } catch (_e) {
          return undefined
        }
      })
    } else {
      obj = obj.url
    }
  } else if (obj instanceof Var) {
    obj = obj.toString().replace(/\$\{([^\}]+)\}/g, (_all, m) => {
      try {
        // tslint:disable-next-line:no-eval
        return eval(`${m}`)
      } catch (_e) {
        return undefined
      }
    })
  } else if (typeof obj === 'object') {
    for (let k in obj) {
      obj[k] = replaceVars(obj[k], $var)
    }
  }
  return obj
}

export class Api {
  static all = {} as { [key: string]: Api }

  key: string
  des: string
  method: 'POST' | 'PUT' | 'GET' | 'HEAD' | 'DELETE'
  url: string
  headers: { [key: string]: string | number }
  body: any
  extends: string
  var: string
  disabled: boolean

  error: any
  res: any
  data() {
    return this.res ? this.res.data : null
  }

  load() {
    if (!this.extends) return this
    const api = Api.all[this.extends]
    if (!api) throw new Error(`Could not found api with key "${this.extends}" to extends`)
    const tmp = _.merge({}, api, this)
    _.merge(this, tmp)
  }

  async install(vars: any) {
    this.url = replaceVars(this.url, vars)
    this.headers = replaceVars(this.headers, vars)
    this.body = replaceVars(this.body, vars)
  }

  async call() {
    try {
      const res = await axios({
        method: this.method,
        data: this.body,
        headers: this.headers,
        url: this.url.toString()
      })
      this.res = {
        headers: res.headers,
        data: res.data
      }
    } catch (e) {
      if (e.response) {
        this.res = {
          headers: e.response.headers,
          data: e.response.data
        }
        this.error = e.response.data
      }
      if (!this.error) this.error = e.message || e
    }
  }

}

export namespace Api {
  export function loadScenario(scenario: Api) {
    const api = new Api()
    for (let k in scenario) {
      api[k] = scenario[k]
    }
    Api.all[scenario.key] = api
    return api
  }
}
