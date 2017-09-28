import { Api } from './Api'

export interface Testcase {
  key?: string
  des?: string
  disabled?: boolean
  apis?: Api[]
}

export class Testcase {
  static all = [] as Testcase[]

  id: number
  apiIndexes = [] as number[]

  async run() {
    for (let i of this.apiIndexes) {
      await Api.all[i].run()
    }
  }
}

export namespace Testcase {
  export function loadScenario(scenario) {
    const tc = new Testcase()
    for (let k in scenario) {
      if (k === 'apis') {
        tc.apiIndexes = tc.apiIndexes.concat(scenario.apis.map(e => Api.loadScenario(e)).filter(e => e !== -1))
      } else {
        tc[k] = scenario[k]
      }
    }
    tc.id = Testcase.all.length
    Testcase.all.push(tc)
    return !tc.disabled ? tc.id : -1
  }
}
