import { Testcase } from '../Testcase'
import { $var, $url } from '../Eval'

export const Test = {
  des: 'Testcase for User',
  apis: [{
    key: 'login',
    disabled: true,
    method: 'POST',
    url: 'http://service.clipvnet.com/oauth/Login',
    headers: {
      pj: '597aaa573f91b427e66ab09d'
    }
  }, {
    extends: 'login',
    disabled: false,
    key: 'user-login',
    body: {
      password: 'admin123',
      username: 'admin'
    },
    var: 'token'
  }, {
    url: 'http://service.clipvnet.com/log',
    method: 'POST',
    headers: {
      token: $var('token.headers.token')
    },
    body: {
      title: 'auto test'
    },
    var: 'log'
  }, {
    url: $url(`http://service.clipvnet.com/log/:logId`, $var('log.data._id')),
    method: 'DELETE',
    headers: {
      token: $var('token.headers.token')
    },
    body: {
      title: 'auto test'
    }
  }]
} as Testcase
