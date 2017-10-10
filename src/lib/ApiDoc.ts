import * as _ from 'lodash'
import { ApiImpl } from './Api'

let i18doc = {} as any
let i18ignore

// Initial doc
(async () => {
  i18ignore = (await import('../doc/i18ignore')).default as any
  const _i18doc = (await import('../doc/i18doc')).default as any
  i18doc = DocImpl.loadScenario({ i18doc: _i18doc } as Doc).i18doc
})()

export abstract class Doc {
  i18doc?: {
    [key: string]: string | DocType
  }
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
  i18doc?: { [key: string]: DocType }

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
    this.i18doc = _.defaultsDeep({}, this.i18doc, i18doc)
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
        $des: this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._des : undefined,
        $required: this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._required : undefined,
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
        rs.$type = `array<${((this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._type : undefined) || ('' + typeof (obj[0]))).toUpperCase()}>`
      }
      return rs
    } else if (typeof obj === 'object') {
      const rs = {
        $des: this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._des : undefined,
        $type: 'object',
        $required: this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._required : undefined,
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
            $des: (this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._des : undefined) || defaultValue || obj,
            $required: this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._required : undefined,
            $type: (this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._type : undefined) || typeof obj
          }
        }
      }
      return {
        $des: (this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._des : undefined) || defaultValue || obj,
        $required: this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._required : undefined,
        $type: (this.i18doc[prefix] !== undefined ? this.i18doc[prefix]._type : undefined) || typeof obj
      }
    }
  }

}

export namespace DocImpl {
  export function loadScenario(scenario: Doc) {
    const cases = ['headers', '$headers', 'body', '$body', 'body.0', '$body.0']
    const doc = new DocImpl()
    doc.i18doc = {}
    for (let k in scenario) {
      if (k === 'i18doc') {
        for (let i in scenario.i18doc) {
          if (typeof scenario.i18doc[i] === 'string') {
            scenario.i18doc[i] = new DocType().des(scenario.i18doc[i] as string)
          }
          if (i.indexOf('*') === 0) {
            cases.forEach((c) => {
              const icase = i.replace(/^\*/, c as string)
              scenario.i18doc[icase] = _.defaultsDeep({}, scenario.i18doc[i], scenario.i18doc[icase])
              if (c.indexOf('$') === 0) {
                (scenario.i18doc[icase] as DocType)._required = false
              }
            })
            delete scenario.i18doc[i]
          } else if (i.indexOf('*') > 0) {
            const match = i.substr(0, i.indexOf('*'))
            for (let j in scenario.i18doc) {
              if (j.indexOf(match) === 0) {
                scenario.i18doc[j] = _.defaultsDeep({}, scenario.i18doc[i], scenario.i18doc[j])
              }
            }
            delete scenario.i18doc[i]
          }
        }
      }
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

export class DocType {
  _des: string
  _type: string
  _required: boolean

  type(_type: string) {
    this._type = _type
    return this
  }

  des(_des: string) {
    this._des = _des
    return this
  }

  required() {
    this._required = true
    return this
  }
}

export namespace DOC {
  export function type(type: string) {
    return new DocType().type(type)
  }
  export function des(des: string) {
    return new DocType().des(des)
  }
  export function required() {
    return new DocType().required()
  }
}
