import { Testcase } from './Testcase'
import * as fs from 'fs'
import * as path from 'path'

export async function runner() {

  const { Test } = require('./testcases/test')
  const tc = Testcase.loadScenario(Test)
  await tc.run()
  fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(tc.apis))
}
