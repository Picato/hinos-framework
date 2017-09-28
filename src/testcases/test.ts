import { Testcase } from '../Testcase'
import { $var, $url } from '../Eval'

export const Test = {
  des: 'Testcase for User',
  apis: [
    {
      key: 'authRequest',
      disabled: true,
      headers: {
        token: $var('token.headers.token')
      }
    },
    {
      des: 'Login web',
      disabled: false,
      doc: {
        group: 'account'
      },
      method: 'POST',
      url: 'http://service.clipvnet.com/oauth/Login',
      headers: {
        pj: '597aaa573f91b427e66ab09d'
      },
      body: {
        password: 'admin123',
        username: 'admin'
      },
      var: 'token'
    },
    {
      extends: 'authRequest',
      disabled: false,
      doc: {
        group: 'account'
      },
      url: 'http://service.clipvnet.com/oauth/role',
      method: 'GET'
    },
    {
      des: 'Push log to log service',
      extends: 'authRequest',
      disabled: false,
      doc: {
        group: 'log'
      },
      url: 'http://service.clipvnet.com/log',
      method: 'POST',
      body: {
        title: 'auto test'
      },
      var: 'log'
    },
    {
      des: 'Try to update log title for log service',
      extends: 'authRequest',
      disabled: false,
      doc: {
        group: 'log'
      },
      url: $url('http://service.clipvnet.com/log/:logId', $var('log.data._id')),
      method: 'PUT',
      body: {
        title: 'auto test 1'
      },
      var: 'log'
    },
    {
      extends: 'authRequest',
      disabled: false,
      doc: {
        group: 'log'
      },
      url: 'http://service.clipvnet.com/log',
      method: 'GET'
    },
    {
      des: 'Remove log in log service',
      extends: 'authRequest',
      disabled: false,
      doc: {
        group: 'log'
      },
      url: $url(`http://service.clipvnet.com/log/:logId`, $var('log.data._id')),
      method: 'DELETE',
      body: {
        title: 'auto test'
      }
    },
    {
      des: 'Test ping method',
      extends: 'authRequest',
      disabled: false,
      doc: {
        group: 'account'
      },
      url: `http://service.clipvnet.com/oauth/ping`,
      method: 'HEAD'
    }]
} as Testcase
