import { Testcase } from '../../Testcase'
import { $var, $url } from '../../Eval'

const user = {
  username: 'testuser',
  password: 'test123'
}

export default {
  des: '[Account] Testcase for admin role',
  apis: [
    {
      key: '#authRequestByToken',
      headers: {
        token: $var('token.headers.token')
      }
    },
    {
      key: '#login',
      des: 'Login web',
      disabled: false,
      doc: { group: 'account' },
      method: 'POST',
      url: 'http://service.clipvnet.com/oauth/Login',
      headers: {
        pj: '597aaa573f91b427e66ab09d'
      },
      body: {
        username: $var('user.data.username'),
        password: user.password
      },
      var: 'token'
    },
    {
      des: 'Remove user after test client api',
      extends: '#authRequestByToken',
      disabled: false,
      doc: { group: 'account' },
      method: 'DELETE',
      url: $url('http://service.clipvnet.com/oauth/account/:accountId', $var('user.data._id'))
    }
  ]
} as Testcase
