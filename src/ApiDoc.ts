import * as _ from 'lodash'
import { ApiImpl } from './Api'

export abstract class Doc {
  i18doc?: any
  i18ignore?: any
  group: string
  order?: number
  note?: string
}

export class DocImpl extends Doc {
  static i18doc = {
    'headers.pj': 'Project id',
    'headers.token': 'Token which is received after login'
  }
  static i18ignore = [
    '$headers.date',
    '$headers.connection',
    '$headers.content-length',
    '$headers.server',
    '$headers.x-dns-prefetch-control',
    '$headers.x-frame-options',
    '$headers.strict-transport-security',
    '$headers.x-download-options',
    '$headers.x-content-type-options',
    '$headers.x-xss-protection',
    '$headers.vary'
  ]
  static all = [] as [{ group: string, order: number, apiIndexes: number[] }]
  headers?: any
  body?: any
  status: any
  $headers: any
  $body: any

  pushToGroup(api) {
    const gIndex = DocImpl.all.findIndex(e => e.group === this.group)
    if (gIndex !== -1) {
      DocImpl.all[gIndex].apiIndexes.push(api.id)
    } else {
      DocImpl.all.push({
        group: this.group,
        order: this.order,
        apiIndexes: [api.id]
      })
    }
  }

  sortInGroup() {
    DocImpl.all.map(e => {
      e.apiIndexes.sort((a, b) => ApiImpl.all[a].doc.order - ApiImpl.all[b].doc.order)
      return e
    }).sort((a, b) => a.order - b.order)
  }

  ignoreDoc(obj, prefix) {
    if (obj instanceof Array) {
      const rs = []
      if (obj.length > 0 && this.i18ignore.indexOf(`${prefix}.0`.toLowerCase()) === -1) {
        rs.push(this.ignoreDoc(obj[0], `${prefix}.0`))
      }
      return rs
    } else if (typeof obj === 'object') {
      const rs = {}
      for (let k in obj) {
        if (this.i18ignore.indexOf(`${prefix}.${k}`.toLowerCase()) !== -1) continue
        rs[k] = this.ignoreDoc(obj[k], `${prefix}.${k}`)
      }
      return rs
    } else {
      return obj
    }
  }

  install(api: ApiImpl) {
    this.i18doc = _.merge({}, DocImpl.i18doc, this.i18doc)
    this.i18ignore = _.union(DocImpl.i18ignore, this.i18ignore)
    this.headers = this.getDocType(this.ignoreDoc(api.headers, 'headers'), 'value', 'headers')
    this.body = this.getDocType(this.ignoreDoc(api.body, 'body'), 'name', 'body')
    // if (api.des === 'Get secret key which allow access api without login') debugger
    this.status = this.getDocType(api.status, 'value', 'status')
    this.$headers = this.getDocType(this.ignoreDoc(api.$headers, '$headers'), 'value', '$headers')
    this.$body = this.getDocType(this.ignoreDoc(api.$body, '$body'), 'name', '$body')

    this.pushToGroup(api)
  }

  private getDocType(obj: any, type: ('value' | 'name'), prefix: string, defaultValue?: any) {
    if (obj instanceof Array) {
      const rs = {
        des: this.i18doc[prefix],
        type: `array`
      } as any
      if (obj[0] instanceof Array) {
        rs.item = this.getDocType(obj[0], type, `${prefix}.0`)
        if (rs.item.type.includes('array<')) {
          rs.type += `<${rs.item.type}>`
          delete rs.item
        }
      } else if (typeof obj[0] === 'object') {
        rs.item = this.getDocType(obj[0], type, `${prefix}.0`)
      } else {
        rs.type = `array<${('' + typeof (obj[0])).toUpperCase()}>`
      }
      return rs
    } else if (typeof obj === 'object') {
      const rs = {
        des: this.i18doc[prefix],
        type: 'object',
        item: {} as any
      }
      for (let k in obj) {
        rs.item[k] = this.getDocType(obj[k], type, `${prefix}.${k}`, type === 'name' ? k : obj[k])
      }
      return rs
    } else {
      if (prefix === '$body' || prefix === 'body') {
        return {
          '': {
            des: this.i18doc[prefix] || defaultValue || obj,
            type: typeof obj
          }
        }
      }
      return {
        des: this.i18doc[prefix] || defaultValue || obj,
        type: typeof obj
      }
    }
  }

}

export namespace DocImpl {
  export function loadScenario(scenario: Doc) {
    const doc = new DocImpl()
    for (let k in scenario) {
      doc[k] = scenario[k]
    }
    return doc
  }
}
