import * as _ from 'lodash'
import axios from 'axios'
import { Var, Url } from './Eval'
import { Doc, DocImpl } from './ApiDoc'
import { TestcaseImpl } from './Testcase'
import { Http } from 'hinos-common/Http'
import * as fs from 'fs'

export abstract class Api {
  key?: string
  des?: string
  method?: 'POST' | 'PUT' | 'GET' | 'HEAD' | 'DELETE' | 'PATCH'
  url?: string | Url
  headers?: { [key: string]: any } = {}
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
  executeTime: number = -1
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
    if (this.var && !this.error) {
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
    // if (this.des === 'Upload file') debugger
    if (this.extends) {
      const _extends = (this.extends instanceof Array) ? this.extends : [this.extends]
      let tmp = {} as any
      for (const ext of _extends) {
        const api = ApiImpl.all.find(e => e.key === ext)
        if (!api) throw new Error(`Could not found api with key "${this.extends}" to extends`)
        _.merge(tmp, api)
      }
      delete tmp.doc
      delete tmp.var
      delete tmp.disabled
      delete tmp.key
      _.defaultsDeep(this, tmp)
    }
    return this
  }

  private install(vars: any) {
    _.defaults(this.headers, ApiImpl.defaultHeaders)
    this.url = this.replaceVars(this.url, vars)
    this.headers = this.replaceVars(this.headers, vars)
    this.body = this.replaceVars(this.body, vars)
  }

  private async call() {
    const now = new Date()
    try {
      let res
      if (this.headers['content-type'] === 'multipart/form-data') {
        res = await FileData.upload(this.url.toString(), this.body, {
          headers: this.headers
        })
      } else {
        res = await axios({
          method: this.method,
          data: this.body,
          headers: this.headers,
          url: this.url.toString()
        })
      }
      this.status = res.status
      this.$headers = res.headers
      this.$body = res.data === '' ? undefined : res.data
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
        // tslint:disable-next-line:no-eval
        const rs = eval(`${m}`)
        if (rs === undefined) throw new Error(`Could not found var "${m}"`)
        return JSON.stringify(rs)
      }))
    } else if (typeof obj === 'object') {
      for (let k in obj) {
        obj[k] = this.replaceVars(obj[k], $var)
      }
    }
    return obj
  }

}

export class FileData {
  constructor(public src: string | string[]) { }

  static async upload(url: string, body: any, headers: { [key: string]: any } = {}) {
    let attach = {} as any
    let field = {} as any
    for (let k in body) {
      if (body[k] instanceof FileData) {
        attach[k] = fs.createReadStream(body[k].src)
      } else {
        field[k] = body[k]
      }
    }
    try {
      const res = await Http.post(url, {
        headers,
        field,
        attach
      })
      return {
        status: res.status,
        headers: JSON.parse(JSON.stringify(res.headers)),
        data: res.body
      }
    } catch (e) {
      throw _.merge(e.error, {
        response: {
          status: e.status,
          headers: e.headers,
          data: e.body
        }
      })
    }
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

export function Part(src: string): FileData {
  return new FileData(src)
}
