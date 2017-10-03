import { Testcase } from '../../Testcase'
import { $var, GET, POST, PUT, DELETE, HEAD, PATCH } from '../../Eval'

export default {
  des: '[Account] Testcase for user role',
  var: {
    $$user: {
      username: 'testuser',
      password: 'test123'
    }
  },
  apis: [
    {
      des: 'Register',
      url: POST('http://service.clipvnet.com/oauth/register'),
      headers: {
        pj: $var('$$pj'),
        role: $var('$$role')
      },
      body: {
        username: $var('$$user.username'),
        password: $var('$$user.password'),
        recover_by: 'testuser@abc.com',
        more: {
          fullname: 'Test user name',
          phone: '093239842'
        }
      },
      var: {
        'user': $var('this.$body')
      },
      doc: { group: 'ACCOUNT' }
    },
    {
      key: '#login',
      des: 'Login web',
      url: POST('http://service.clipvnet.com/oauth/Login'),
      headers: {
        pj: $var('$$pj')
      },
      body: {
        username: $var('user.username'),
        password: $var('$$user.password')
      },
      var: {
        'token': $var('this.$headers.token')
      },
      doc: { group: 'ACCOUNT' }
    },
    {
      extends: '#ping',
      doc: { group: 'ACCOUNT' }
    },
    {
      key: '#generate-secretkey',
      des: 'Generate secret key which allow access api without login',
      extends: '#authRequestByToken',
      url: PUT('http://service.clipvnet.com/oauth/Secretkey'),
      var: {
        'secretkey': $var('this.$body')
      },
      doc: { group: 'SECRET KEY' }
    },
    {
      des: 'Get secret key which allow access api without login',
      extends: '#authRequestBySecretkey',
      url: GET('http://service.clipvnet.com/oauth/Secretkey'),
      doc: { group: 'SECRET KEY' }
    },
    {
      des: 'Remove secret key which not allow access api without login',
      extends: '#authRequestByToken',
      url: DELETE('http://service.clipvnet.com/oauth/Secretkey'),
      doc: { group: 'SECRET KEY' }
    },
    ['#ping', '#authRequestBySecretkey'],
    {
      des: 'Update user information',
      extends: '#authRequestByToken',
      url: PUT('http://service.clipvnet.com/oauth/me'),
      body: {
        more: {
          fullname: 'Updated name'
        }
      },
      doc: { group: 'ACCOUNT' }
    },
    {
      des: 'Get user information',
      extends: '#authRequestByToken',
      url: GET('http://service.clipvnet.com/oauth/me'),
      var: 'me',
      doc: { group: 'ACCOUNT' }
    },
    {
      des: 'Get user roles which grant permission for web, api or mobile',
      extends: '#authRequestByToken',
      url: GET('http://service.clipvnet.com/oauth/MyRoles?type=:deviceType', 'web'),
      var: 'roles',
      doc: {
        group: 'ROLE',
        note: `Note: Type must be in [web, mob, api]`
      }
    },
    {
      des: 'Logout',
      extends: '#authRequestByToken',
      url: GET('http://service.clipvnet.com/oauth/logout'),
      doc: { group: 'ACCOUNT' }
    },
    '#ping'
  ]
} as Testcase
