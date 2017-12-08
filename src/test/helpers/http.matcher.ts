import axios from 'axios'
import { AxiosResponse } from 'axios'

export function httpMatcher(chai: any) {
  const Assertion: any = chai.Assertion
  Assertion.addMethod('http', function (y) {
    let actual = this._obj as AxiosResponse
    let expected = y instanceof Array ? y : [y]
    this.assert(expected.indexOf(actual.status) !== -1,
      `expected http status #{this} to be in [#{exp}] but got #{act} >>> ${typeof actual.data === 'object' ? JSON.stringify(actual.data) : actual.data}`,
      `expected http status #{this} to be not includes #{act} >>> ${typeof actual.data === 'object' ? JSON.stringify(actual.data) : actual.data}`,
      expected.join(','),
      actual.status
    )
  })
}
