import * as _ from 'lodash'
import axios from 'axios'
import { Var, Url } from './Eval'
import { Doc, DocImpl } from './ApiDoc'

function replaceVars(obj, $var) {
  if (obj === undefined || obj === null) return obj
  if (obj instanceof Array) {
    obj = obj.map(e => replaceVars(e, $var))
  } else if (obj instanceof Url) {
    if (obj.vars && obj.vars.length > 0) {
      let idx = 0
      obj.toString = () => {
        return obj.url.replace(/:([A-Za-z0-9_]+)/g, (_all, _m) => {
          try {
            // tslint:disable-next-line:no-eval
            return replaceVars(obj.vars[idx++], $var)
          } catch (_e) {
            return undefined
          }
        })
      }
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

export abstract class Api {
  key?: string
  des?: string
  method: 'POST' | 'PUT' | 'GET' | 'HEAD' | 'DELETE'
  url: string | Url
  headers?: { [key: string]: any }
  body?: any
  extends?: string | string[]
  var?: string
  disabled?: boolean
  doc?: Doc
}

export class ApiImpl extends Api {
  static defaultHeaders = {
    'content-type': 'application/json'
  }
  static all = [] as Api[]
  static vars = {} as any

  id: number
  executeTime: number
  error: any
  res: any

  get _disabled() {
    return this.disabled || !this.url
  }

  async run() {
    this.install(ApiImpl.vars)
    await this.call()
    if (this.var) {
      ApiImpl.vars[this.var] = {
        data: this.res.data,
        headers: this.res.headers
      }
    }
  }

  load() {
    if (this.extends) {
      const _extends = (this.extends instanceof Array) ? this.extends : [this.extends]
      let tmp = {}
      for (const ext of _extends) {
        const api = ApiImpl.all.find(e => e.key === ext)
        if (!api) throw new Error(`Could not found api with key "${this.extends}" to extends`)
        _.merge(tmp, api, this)
      }
      _.merge(this, tmp)
    }
    return this
  }

  private async install(vars: any) {
    this.url = replaceVars(this.url, vars)
    this.headers = replaceVars(this.headers, vars)
    this.body = replaceVars(this.body, vars)
  }

  private async call() {
    const now = new Date()
    try {
      const res = await axios({
        method: this.method,
        data: this.body,
        headers: this.headers,
        url: this.url.toString()
      })
      this.res = {
        headers: res.headers,
        status: res.status,
        data: res.data === '' ? undefined : res.data
      }
    } catch (e) {
      if (e.response) {
        this.res = {
          headers: e.response.headers,
          status: e.response.status,
          data: e.response.data === '' ? undefined : e.response.data
        }
        this.error = e.response.data
      }
      if (!this.error) this.error = e.message || e || 'Unknown error'
    } finally {
      (this.doc as DocImpl).install(this)
      this.executeTime = new Date().getTime() - now.getTime()
    }
  }

}

export namespace Api {
  export function loadScenario(scenario: Api) {
    const api = new ApiImpl()
    for (let k in scenario) {
      api[k] = scenario[k]
    }
    api.headers = _.merge({}, ApiImpl.defaultHeaders, api.headers)
    api.doc = DocImpl.loadScenario(api.doc)
    api.id = ApiImpl.all.length
    api.load()
    ApiImpl.all.push(api)
    return !api._disabled ? api.id : -1
  }
}
