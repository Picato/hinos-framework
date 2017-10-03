import { Testcase } from '../../Testcase'
import { $var, GET, POST, PUT, DELETE, HEAD, PATCH } from '../../Eval'

export default {
  des: '[Account] Testcase for admin role',
  var: {
    $$admin: {
      username: 'testuser',
      password: 'test123'
    }
  },
  apis: [
    {
      key: '#login',
      des: 'Login web',
      url: POST('http://service.clipvnet.com/oauth/Login'),
      headers: {
        pj: $var('$$pj')
      },
      body: {
        username: $var('$$admin.username'),
        password: $var('$$admin.password')
      },
      var: {
        'token': $var('this.$headers.token')
      }
    },
    {
      extends: '#authRequestByToken',
      des: 'Check authorization when call api',
      url: HEAD('http://service.clipvnet.com/oauth/Authoriz?path=:path&actions=:actions', 'hinos-oauth-service>Me', 'GET_INFOR, UPDATE'),
      doc: { group: 'Admin Account' }
    },
    {
      des: 'Remove user after test client api',
      extends: '#authRequestByToken',
      url: DELETE('http://service.clipvnet.com/oauth/account/:accountId', $var('user._id')),
      doc: { group: 'Admin Account' }
    }
  ]
} as Testcase
