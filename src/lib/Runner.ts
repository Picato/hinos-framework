import * as chalk from 'chalk'
import { TestcaseImpl, Testcase } from './Testcase'
import { DocImpl } from './ApiDoc'
import { ApiImpl } from './Api'
import * as fs from 'fs'
import * as path from 'path'
import { Config } from '../config'

export async function runner(config: Config) {
  const c0 = chalk.black('┌')
  const c1 = chalk.black('├')
  const c2 = chalk.black('└')
  const ce = chalk.black('│')
  const result = {
    title: config.title,
    des: config.des,
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
    tcs: [] as TestcaseImpl[],
    apis: [] as ApiImpl[],
    doc: [],
    vars: {} as any,
    status: 1 // 1: Passed, -1: Failed
  }

  TestcaseImpl.all = []
  ApiImpl.all = []
  DocImpl.all = [] as any

  const tcs = config.scenarios.map((imp) => {
    const Test = require(path.join('..', imp)).default as Testcase
    return TestcaseImpl.loadScenario(Test)
  }).filter(i => i !== -1).map(e => TestcaseImpl.all[e]) as TestcaseImpl[]

  // tslint:disable-next-line:no-multi-spaces
  console.log(`${chalk.bgCyan.bold(`   ${result.title.replace(/./g, ' ')}   `)}`)
  // tslint:disable-next-line:no-multi-spaces
  console.log(`${chalk.bgCyan.bold(`   ${result.title}   `)}`)
  // tslint:disable-next-line:no-multi-spaces
  console.log(`${chalk.bgCyan.bold(`   ${result.title.replace(/./g, ' ')}   `)}`)
  console.log('')
  console.log('')

  const now = new Date()
  for (const tc of tcs) {
    console.log(`${chalk.bgBlue.bold(` ${tc.title} `)}`)
    const apis = tc.apiIndexes.map(i => ApiImpl.all[i]) as ApiImpl[]
    // tslint:disable-next-line:one-variable-per-declaration
    try {
      const len = apis.length
      for (let i = 0; i < len; i++) {
        const api = apis[i]
        const c = i === 0 ? c0 : (i === len - 1 ? c2 : c1)
        try {
          await api.run()
        } catch (e) {
          api.error = e.message || e || 'Run api error'
        }
        if (!api.error) {
          console.log(' ', c, chalk.green.bold(api.title), chalk.black.bold(api.method), chalk.black.underline.italic(api.url.requestPath), chalk.blue(`(${api.executeTime} ms)`))
          result.summary.api.passed++
        } else {
          if (tc.status === TestcaseImpl.Status.PASSED) tc.status = TestcaseImpl.Status.FAILED
          result.summary.api.failed++
          console.log(' ', c, chalk.red.bold(api.title), chalk.black.bold(api.method), chalk.black.underline.italic(api.url.requestPath), chalk.blue(`(${api.executeTime} ms)`))
          console.log(' ', ce, chalk.red.italic(` > ${api.error}`))
          // throw new Error(api.error)
        }
      }
    } catch (e) {
      tc.status = TestcaseImpl.Status.FAILED
    }
    if (tc.status === TestcaseImpl.Status.PASSED) result.summary.testcase.passed++
    else result.summary.testcase.failed++
    console.log('')
    result.tcs.push(tc)
    if (result.status !== -1 && tc.status === TestcaseImpl.Status.FAILED) result.status = -1
  }
  const executeTime = new Date().getTime() - now.getTime()
  result.vars = ApiImpl.vars
  result.apis = ApiImpl.all as ApiImpl[]
  result.doc = DocImpl.all
  result.doc.sort((a, b) => config.groups.indexOf(a.group) - config.groups.indexOf(b.group))

  const fin = path.join('src', 'result.html')
  const fout = path.resolve(config.output)
  let cnt = fs.readFileSync(fin).toString()
  cnt = cnt.replace(/\/\*DATA\*\//, JSON.stringify(result)).replace(/\/\*TITLE\*\//, result.title)
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
  console.log('')
  console.log(chalk.black('-----------------------------------------------------------------------------------'))
  console.log('')

  return result
}
