import { runner } from './Runner'
import Config from './Config'
import { $var, GET, POST, PUT, DELETE, HEAD, PATCH } from './Eval'
import { API } from './Api'
import { DOC } from './ApiDoc'

(global as any).DOC = DOC;
(global as any).API = API;
(global as any).$var = $var;
(global as any).GET = GET;
(global as any).POST = POST;
(global as any).PUT = PUT;
(global as any).DELETE = DELETE;
(global as any).HEAD = HEAD;
(global as any).PATCH = PATCH;

(async () => {
  for (let config of Config) {
    await runner(config)
  }
})()
