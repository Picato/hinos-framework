import { Api, ApiImpl } from './Api'

export abstract class Testcase {
  key?: string
  des: string
  disabled?: boolean
  apis?: Api[]
  var?: string | { [key: string]: any } = {}
}

export class TestcaseImpl extends Testcase {
  static all = [] as TestcaseImpl[]

  id: number
  apiIndexes = [] as number[]
  status = TestcaseImpl.Status.PASSED

}

export namespace TestcaseImpl {
  export const Status = {
    PASSED: 1,
    FAILED: 0
  }
  export function loadScenario(scenario: Testcase) {
    const tc = new TestcaseImpl()
    for (let k in scenario) {
      if (k === 'apis') {
        tc.apiIndexes = tc.apiIndexes.concat(scenario.apis.map(e => Api.loadScenario(e, this)).filter(e => e !== -1))
      } else if (k === 'var' && typeof scenario.var === 'object') {
        for (let k0 in scenario.var) {
          ApiImpl.vars[k0] = scenario.var[k0]
        }
      } else {
        tc[k] = scenario[k]
      }
    }
    tc.id = TestcaseImpl.all.length
    TestcaseImpl.all.push(tc)
    return (!tc.disabled && tc.apiIndexes.length > 0) ? tc.id : -1
  }
}
