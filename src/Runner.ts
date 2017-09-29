import * as chalk from 'chalk'
import { TestcaseImpl, Testcase } from './Testcase'
import { DocImpl } from './ApiDoc'
import { ApiImpl } from './Api'
import { Url } from './Eval'
import * as fs from 'fs'
import * as path from 'path'

export async function runner() {
  const c0 = chalk.black('┌')
  const c1 = chalk.black('├')
  const c2 = chalk.black('└')
  const ce = chalk.black('│')
  const result = {
    summary: {
      testcase: {
        passed: 0,
        failed: 0,
        get tested() {
          return this.passed + this.failed
        }
      },
      api: {
        passed: 0,
        failed: 0,
        get tested() {
          return this.passed + this.failed
        }
      }
    },
    tcs: [],
    apis: [],
    doc: [],
    vars: {}
  }

  const scenarios = ['./testcases/oauth/client'] as string[]
  const tcs = scenarios.map(imp => {
    const { Test } = require(imp) as { Test: Testcase }
    return TestcaseImpl.loadScenario(Test)
  }).filter(i => i !== -1).map(e => TestcaseImpl.all[e]) as TestcaseImpl[]

  console.log(`${chalk.bgGreen.bold(`                 `)}`)
  console.log(`${chalk.bgGreen.bold(`   API testing   `)}`)
  console.log(`${chalk.bgGreen.bold(`                 `)}`)
  console.log('')
  console.log('')

  const now = new Date()
  for (const tc of tcs) {
    console.log(`${chalk.bgCyan.bold(` ${tc.des} `)}`)
    const apis = tc.apiIndexes.map(i => ApiImpl.all[i]) as ApiImpl[]
    // tslint:disable-next-line:one-variable-per-declaration
    for (let i = 0, len = apis.length; i < len; i++) {
      const api = apis[i]
      const c = i === 0 ? c0 : (i === len - 1 ? c2 : c1)
      await api.run()
      if (!api.error) {
        console.log(' ', c, chalk.green.bold(api.method), chalk.black.underline.italic((api.url as Url).url || api.url as string), chalk.blue(`(${api.executeTime} ms)`))
        result.summary.api.passed++
      } else {
        if (tc.status === TestcaseImpl.Status.PASSED) tc.status = TestcaseImpl.Status.FAILED
        result.summary.api.failed++
        console.log(' ', c, chalk.red.bold(api.method), chalk.black.underline.italic((api.url as Url).url || api.url as string), chalk.blue(`(${api.executeTime} ms)`))
        console.log(' ', ce, chalk.red.italic(` > ${api.error}`))
      }
    }
    if (tc.status === TestcaseImpl.Status.PASSED) result.summary.testcase.passed++
    else result.summary.testcase.failed++
    console.log('')
    result.tcs.push(tc)
  }
  const executeTime = new Date().getTime() - now.getTime()
  result.vars = ApiImpl.vars
  result.apis = ApiImpl.all
  result.doc = DocImpl.all

  const fin = path.join('src', 'result.html')
  const fout = path.join('src', 'doc-test.html')
  let cnt = fs.readFileSync(fin).toString()
  cnt = cnt.replace(/\/\*TEST_RESULT_DATA\*\//, JSON.stringify(result))
  fs.writeFileSync(fout, cnt)

  console.log('')
  if (result.summary.api.failed > 0) console.log(`${chalk.bgRed.bold(' SUMMARY ')}`)
  else console.log(`${chalk.bgGreen.bold(' SUMMARY ')}`)

  console.log('')
  console.log(chalk.black('  ┌'), chalk.bold.cyan('Time'), `\t${chalk.blue(`${executeTime}ms`)}`)
  console.log(chalk.black('  ├'), chalk.bold.cyan('Testcase'), `\t${chalk.green(`${result.summary.testcase.passed}`)}/${chalk.red(`${result.summary.testcase.failed}`)}/${chalk.yellow(`${result.summary.testcase.tested}`)}`)
  console.log(chalk.black('  ├'), chalk.bold.cyan('Api'), `\t${chalk.green(`${result.summary.api.passed}`)}/${chalk.red(`${result.summary.api.failed}`)}/${chalk.yellow(`${result.summary.api.tested}`)}`)
  console.log(chalk.black('  └'), chalk.bold.cyan('Saved to'), `\t${chalk.black.underline.italic(fout)}`)
  console.log('')
}
