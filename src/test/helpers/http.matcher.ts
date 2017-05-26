import { Http } from 'hinos-common/Http';

export function httpMatcher(chai: any) {
  var Assertion: any = chai.Assertion;
  Assertion.addMethod('http', function (y) {
    let actual = <Http.Response>this._obj;
    let expected = y instanceof Array ? y : [y];
    this.assert(expected.indexOf(actual.status) !== -1,
      `expected http status #{this} to be in [#{exp}] but got #{act} >>> ${typeof actual.body === 'object' ? JSON.stringify(actual.body) : actual.body}`,
      `expected http status #{this} to be not includes #{act} >>> ${typeof actual.body === 'object' ? JSON.stringify(actual.body) : actual.body}`,
      expected.join(','),
      actual.status
    );
  });
}