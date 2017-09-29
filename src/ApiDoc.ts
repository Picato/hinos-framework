import * as _ from 'lodash'
import { ApiImpl } from './Api'

export abstract class Doc {
  i18doc?: any
  i18ignore?: any
  group: string
  order?: number
}

export class DocImpl extends Doc {
  static i18doc = {
    'headers.pj': 'Project id',
    'headers.token': 'Token which is received after login'
  }
  static i18ignore = [
    'res.headers.date',
    'res.headers.connection',
    'res.headers.content-length',
    'res.headers.server',
    'res.headers.x-dns-prefetch-control',
    'res.headers.x-frame-options',
    'res.headers.strict-transport-security',
    'res.headers.x-download-options',
    'res.headers.x-content-type-options',
    'res.headers.x-xss-protection',
    'res.headers.vary'
  ]
  static all = [] as [{ group: string, order: number, apiIndexes: number[] }]
  headers?: any
  body?: any
  res?= {
    status: undefined as any,
    headers: undefined as any,
    data: undefined as any
  }

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

  install(api: ApiImpl) {
    this.i18doc = _.merge({}, DocImpl.i18doc, this.i18doc)
    this.i18ignore = _.union(DocImpl.i18ignore, this.i18ignore)
    this.headers = this.getDocType(api.headers, 'value', 'headers')
    this.body = this.getDocType(api.body, 'name', 'body')
    this.res = {
      status: this.getDocType(api.res.status, 'value', 'res.status'),
      headers: this.getDocType(api.res.headers, 'value', 'res.headers'),
      data: this.getDocType(api.res.data, 'name', 'res.data')
    }

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
        if (this.i18ignore.indexOf(`${prefix}.${k}`.toLowerCase()) !== -1) continue
        rs.item[k] = this.getDocType(obj[k], type, `${prefix}.${k}`, type === 'name' ? k : obj[k])
      }
      return rs
    } else {
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
