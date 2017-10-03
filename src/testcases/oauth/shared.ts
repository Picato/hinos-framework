import { Testcase } from '../../Testcase'
import { $var } from '../../Eval'

export default {
  disabled: true,
  var: {
    $$pj: '597aaa573f91b427e66ab09d',
    $$role: '597aaa573f91b427e66ab09e'
  },
  apis: [
    {
      key: '#authRequestByToken',
      headers: {
        token: $var('token')
      }
    },
    {
      key: '#authRequestBySecretkey',
      headers: {
        token: $var('secretkey')
      }
    },
    {
      key: '#ping',
      des: 'Ping to keep connection',
      extends: '#authRequestByToken',
      method: 'HEAD',
      url: 'http://service.clipvnet.com/oauth/ping'
    }
  ]
} as Testcase
