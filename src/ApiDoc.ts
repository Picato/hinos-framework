// import * as _ from 'lodash'
import { Api } from './Api'

export class ApiDoc {
  static all = [] as [{ group: string, order: number, apiIndexes: number[] }]
  group?: string = 'default'
  order?: number = 0
  headers: any
  body: any
  res = {
    headers: undefined as any,
    data: undefined as any
  }
  // Thanh : check lai phan get Doc
  private static getDocType(obj: any) {
    if (obj instanceof Array) {
      const rs = {
        des: '',
        type: `array`
      } as any
      if (typeof obj[0] === 'object') {
        rs.item = ApiDoc.getDocType(obj[0])
      } else {
        rs.type = `array<${('' + typeof (obj[0])).toUpperCase()}>`
      }
      return rs
    } else if (typeof obj === 'object') {
      const rs = {
        des: '',
        type: 'object',
        item: {} as any
      }
      for (let k in obj) {
        rs.item[k] = ApiDoc.getDocType(obj[k])
      }
      return rs
    } else {
      return {
        des: '',
        type: typeof obj
      }
    }
  }

  pushToGroup(api) {
    const gIndex = ApiDoc.all.findIndex(e => e.group === this.group)
    if (gIndex !== -1) {
      ApiDoc.all[gIndex].apiIndexes.push(api.id)
    } else {
      ApiDoc.all.push({
        group: this.group,
        order: this.order,
        apiIndexes: [api.id]
      })
    }
  }

  sortInGroup() {
    ApiDoc.all.map(e => {
      e.apiIndexes.sort((a, b) => Api.all[a].doc.order - Api.all[b].doc.order)
      return e
    }).sort((a, b) => a.order - b.order)
  }

  install(api: Api) {
    this.headers = ApiDoc.getDocType(api.headers)
    this.body = ApiDoc.getDocType(api.body)
    this.res = ApiDoc.getDocType(api.res)
    this.pushToGroup(api)
  }

}

export namespace ApiDoc {
  export function loadScenario(scenario: ApiDoc) {
    const doc = new ApiDoc()
    for (let k in scenario) {
      doc[k] = scenario[k]
    }
    return doc
  }
}
