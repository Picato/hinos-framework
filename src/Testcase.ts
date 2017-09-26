import { Api } from './Api'

export class Testcase {
  static all = {} as { [key: string]: Testcase }
  key: string
  des: string
  apis: Api[]
  vars: { [key: string]: any } = {}

  async run() {
    const apis = []
    for (let api of this.apis) {
      api.load()
      if (!api.disabled) {
        await api.install(this.vars)
        await api.call()
        if (api.var) {
          this.vars[api.var] = {
            data: api.res.data,
            headers: api.res.headers
          }
        }
        if (api.error) console.log(api.error)
        apis.push(api)
      }
    }
    this.apis = apis
  }
}

export namespace Testcase {
  export function loadScenario(scenario) {
    const tc = new Testcase()
    tc.des = scenario.des
    if (scenario.apis) tc.apis = scenario.apis.map(e => Api.loadScenario(e))
    Testcase.all[scenario.key] = tc
    return tc
  }
}
