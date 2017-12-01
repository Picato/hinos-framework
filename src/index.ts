import { runner } from './lib/Runner'
import Config from './config'
import { $var, GET, POST, PUT, DELETE, HEAD, PATCH } from './lib/Eval'
import { API, Part } from './lib/Api'
import { DOC } from './lib/ApiDoc'
import { INCLUDE } from './lib/Testcase'
import * as chalk from 'chalk'
import { DELAY } from './lib/Delay';

(global as any).Part = Part;
(global as any).INCLUDE = INCLUDE;
(global as any).DOC = DOC;
(global as any).API = API;
(global as any).$var = $var;
(global as any).GET = GET;
(global as any).POST = POST;
(global as any).PUT = PUT;
(global as any).DELETE = DELETE;
(global as any).HEAD = HEAD;
(global as any).PATCH = PATCH;
(global as any).DELAY = DELAY;

(async () => {
  let isOk = true
  const startTime = new Date().getTime()
  for (let config of Config) {
    const rs = await runner(config)
    isOk = isOk && rs.status > 0
  }
  if (isOk) console.log(`${chalk.bgYellow.black.bold(` EXECUTED TIME: ${new Date().getTime() - startTime} ms `)}`)
  else console.log(`${chalk.bgYellow.red.bold(` EXECUTED TIME: ${new Date().getTime() - startTime} ms `)}`)
  console.log('')
})()

