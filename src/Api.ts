import * as _ from 'lodash'
import axios from 'axios'
import { Var, Url } from './Eval'
import * as url from 'url'
import { Doc, DocImpl } from './ApiDoc'
import { TestcaseImpl } from './Testcase'
import * as FormData from 'form-data'
import { Http } from 'hinos-common/Http'

export abstract class Api {
  key?: string
  des?: string
  method?: 'POST' | 'PUT' | 'GET' | 'HEAD' | 'DELETE' | 'PATCH'
  url?: string | Url
  headers?: { [key: string]: any }
  body?: any
  extends?: string | string[]
  var?: string | { [key: string]: any }
  disabled?: boolean = false
  doc?: Doc = undefined
}

export class ApiImpl extends Api {
  static defaultHeaders = {
    'content-type': 'application/json'
  }
  static all = [] as Api[]
  static vars = {} as { [key: string]: any }

  id: number
  executeTime: number
  error: any
  status: number
  $headers: any
  $body: any

  get _disabled() {
    return this.disabled || !this.url
  }

  async run() {
    const vars = ApiImpl.vars
    this.install(vars)
    await this.call()
    if (this.var) {
      if (typeof this.var === 'string') {
        ApiImpl.vars[this.var] = {
          status: this.status,
          headers: this.headers,
          body: this.body,
          $headers: this.$headers,
          $body: this.$body
        }
      } else {
        for (let k in this.var) {
          ApiImpl.vars[k] = this.replaceVars(this.var[k], vars)
        }
      }
    }
  }

  load() {
    if (this.extends) {
      const _extends = (this.extends instanceof Array) ? this.extends : [this.extends]
      let tmp = {} as any
      for (const ext of _extends) {
        const api = ApiImpl.all.find(e => e.key === ext)
        if (!api) throw new Error(`Could not found api with key "${this.extends}" to extends`)
        _.merge(tmp, api)
      }
      tmp.doc = undefined
      _.defaultsDeep(this, tmp)
    }
    return this
  }

  private async install(vars: any) {
    this.url = this.replaceVars(this.url, vars)
    this.headers = this.replaceVars(this.headers, vars)
    this.body = this.replaceVars(this.body, vars)
  }

  private async call() {
    const now = new Date()
    try {
      let res
      if (this.body instanceof FormData) {
        this.body.headers = this.headers
        const str = this.url.toString()
        res = await Http.post(str, {
          headers: this.headers,
          attach: {
            files: require('fs').createReadStream(`C:\\test.jpg`)
          }
        })
        this.status = res.status
        this.$headers = res.headers
        this.$body = res.body === '' ? undefined : res.body
      } else {
        res = await axios({
          method: this.method,
          data: this.body,
          headers: this.headers,
          url: this.url.toString()
        })
        this.status = res.status
        this.$headers = res.headers
        this.$body = res.data === '' ? undefined : res.data
      }
    } catch (e) {
      if (e.response) {
        this.status = e.response.status
        this.$headers = e.response.headers
        this.$body = e.response.data === '' ? undefined : e.response.data
        this.error = this.$body
      }
      if (!this.error) this.error = e.message || e || 'Unknown error'
    } finally {
      this.executeTime = new Date().getTime() - now.getTime()
      if (this.doc) (this.doc as DocImpl).install(this)
    }
  }

  private replaceVars(obj, $var) {
    if (obj === undefined || obj === null) return obj
    if (obj instanceof Array) {
      obj = obj.map(e => this.replaceVars(e, $var))
    } else if (obj instanceof Url) {
      if (obj.vars && obj.vars.length > 0) {
        let idx = 0
        obj.toString = () => {
          return obj.url.replace(/:([A-Za-z0-9_]+)/g, (_all, _m) => {
            try {
              // tslint:disable-next-line:no-eval
              return this.replaceVars(obj.vars[idx++], $var)
            } catch (_e) {
              return undefined
            }
          })
        }
      } else {
        obj = obj.url
      }
    } else if (obj instanceof Var) {
      obj = JSON.parse(obj.toString().replace(/\$\{([^\}]+)\}/g, (_all, m) => {
        try {
          // tslint:disable-next-line:no-eval
          const rs = eval(`${m}`)
          return JSON.stringify(rs)
        } catch (_e) {
          return undefined
        }
      }))
    } else if (typeof obj === 'object') {
      for (let k in obj) {
        obj[k] = this.replaceVars(obj[k], $var)
      }
    }
    return obj
  }

}

export namespace Api {
  export function loadScenario(scenario: Api | string | string[], tc: TestcaseImpl) {
    const api = new ApiImpl()
    if (typeof scenario === 'string' || (scenario instanceof Array)) {
      scenario = { extends: scenario } as Api
    }
    for (let k in scenario as Api) {
      api[k] = scenario[k]
    }
    if (!api.method && api.url instanceof Url) api.method = api.url.method as any
    api.headers = _.merge({}, ApiImpl.defaultHeaders, api.headers)
    if (api.doc) api.doc = DocImpl.loadScenario(api.doc)
    api.id = ApiImpl.all.length
    api.load()
    if (tc.disabled) api.disabled = true
    ApiImpl.all.push(api)
    return !api._disabled ? api.id : -1
  }
}

export function API(des: string, options: Api, meta: { key?: string, extends?: string | string[] } = {}): Api {
  return _.merge({ des }, options, meta)
}

export function Multipart(obj: any) {
  const form = new FormData()
  for (let i in obj) {
    form.append(i, obj[i])
  }
  return form
}
