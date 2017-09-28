import { Testcase } from './Testcase'
import { ApiDoc } from './ApiDoc'
import { Api } from './Api'
import * as fs from 'fs'
import * as path from 'path'

export async function runner() {
  const result = {
    tcs: [],
    apis: [],
    doc: [],
    vars: {}
  }

  const scenarios = ['./testcases/test'] as string[]
  const tcs = scenarios.map(imp => {
    const { Test } = require(imp) as { Test: Testcase }
    return Testcase.loadScenario(Test)
  }).filter(i => i !== -1).map(e => Testcase.all[e]) as Testcase[]

  for (const tc of tcs) {
    for (let api of tc.apiIndexes.map(i => Api.all[i]) as Api[]) {
      await api.run()
    }
    result.tcs.push(tc)
  }
  result.vars = Api.vars
  result.apis = Api.all
  result.doc = ApiDoc.all

  fs.writeFileSync(path.join(__dirname, '..', 'data.json'), JSON.stringify(result))
}
