import * as _ from 'lodash'
import { ApiImpl } from './Api'

const i18doc = require('../../src/i18doc.json') as any
for (let k in i18doc) {
  if (k.indexOf('*.') === 0) {
    i18doc[k.replace(/^\*/, 'headers')] = i18doc[k.replace(/^\*/, '$headers')] = i18doc[k.replace(/^\*/, 'body')] = i18doc[k.replace(/^\*/, '$body')] = i18doc[k.replace(/^\*/, '$body.0')] = i18doc[k.replace(/^\*/, 'body.0')] = i18doc[k]
    delete i18doc[k]
  }
}
const i18ignore = require('../../src/i18ignore.json')

export abstract class Doc {
  i18doc?: any
  i18ignore?: any
  title?: string
  group: string
  order?: number
  note?: string | string[]
  tags?: string | string[] = []
}

export class DocImpl extends Doc {
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
    if (!this.title) this.title = api.des
    if (!this.tags) this.tags = []
    if (this.note && this.note instanceof Array) this.note = this.note.join('\n')
    if (typeof this.tags === 'string') this.tags = [this.tags]
    this.i18doc = _.merge({}, i18doc, this.i18doc)
    this.i18ignore = _.union(i18ignore, this.i18ignore)
    this.headers = this.getDocType(this.ignoreDoc(api.headers, 'headers'), 'value', 'headers')
    this.body = this.getDocType(this.ignoreDoc(api.body, 'body'), 'name', 'body')
    this.status = this.getDocType(api.status, 'value', 'status')
    this.$headers = this.getDocType(this.ignoreDoc(api.$headers, '$headers'), 'value', '$headers')
    this.$body = this.getDocType(this.ignoreDoc(api.$body, '$body'), 'name', '$body')

    this.pushToGroup(api)
  }

  private getDocType(obj: any, type: ('value' | 'name'), prefix: string, defaultValue?: any) {
    if (obj instanceof Array) {
      const rs = {
        $des: this.i18doc[prefix],
        $type: `array`
      } as any
      if (obj[0] instanceof Array) {
        rs.$item = this.getDocType(obj[0], type, `${prefix}.0`)
        if (rs.$item.type.includes('array<')) {
          rs.$type += `<${rs.$item.type}>`
          delete rs.$item
        }
      } else if (typeof obj[0] === 'object') {
        rs.$item = this.getDocType(obj[0], type, `${prefix}.0`)
      } else {
        rs.$type = `array<${('' + typeof (obj[0])).toUpperCase()}>`
      }
      return rs
    } else if (typeof obj === 'object') {
      const rs = {
        $des: this.i18doc[prefix],
        $type: 'object',
        $item: {} as any
      }
      for (let k in obj) {
        rs.$item[k] = this.getDocType(obj[k], type, `${prefix}.${k}`, type === 'name' ? k : obj[k])
      }
      return rs
    } else {
      if (prefix === '$body' || prefix === 'body') {
        return {
          '': {
            $des: this.i18doc[prefix] || defaultValue || obj,
            $type: typeof obj
          }
        }
      }
      return {
        $des: this.i18doc[prefix] || defaultValue || obj,
        $type: typeof obj
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

export function DOC(title: string, group: string, tags?: string | string[], options?: Api, meta?: { key?: string, extends?: string | string[] }): Api {
  if (typeof tags !== 'string' && !(tags instanceof Array)) {
    meta = options as any
    options = tags as Api
    tags = []
  }
  return _.merge({ des: title, doc: { title, group, tags } }, options, meta)
}
