import { Testcase } from '../../Testcase'
import { $var } from '../../Eval'

const user = {
  username: 'testuser',
  password: 'test123'
}

export default {
  des: '[Account] Testcase for user role',
  apis: [
    {
      key: '#authRequestByToken',
      headers: {
        token: $var('token.headers.token')
      }
    },
    {
      key: '#authRequestBySecretkey',
      headers: {
        token: $var('secretkey.data')
      }
    },
    {
      key: '#ping',
      des: 'Ping to keep connection',
      extends: '#authRequestByToken',
      disabled: true,
      doc: { group: 'account' },
      method: 'HEAD',
      url: 'http://service.clipvnet.com/oauth/ping'
    },
    {
      des: 'Register',
      disabled: false,
      doc: { group: 'account' },
      method: 'POST',
      url: 'http://service.clipvnet.com/oauth/register',
      headers: {
        pj: '597aaa573f91b427e66ab09d',
        role: '597aaa573f91b427e66ab09e'
      },
      body: {
        username: user.username,
        password: user.password,
        recover_by: 'testuser@abc.com',
        more: {
          fullname: 'Test user name',
          phone: '093239842'
        }
      },
      var: 'user'
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
      key: '#generate-secretkey',
      des: 'Generate secret key which allow access api without login',
      extends: '#authRequestByToken',
      disabled: false,
      doc: { group: 'account' },
      method: 'PUT',
      url: 'http://service.clipvnet.com/oauth/Secretkey',
      var: 'secretkey'
    },
    {
      des: 'Get secret key which allow access api without login',
      extends: '#authRequestBySecretkey',
      disabled: false,
      doc: { group: 'account' },
      method: 'GET',
      url: 'http://service.clipvnet.com/oauth/Secretkey'
    },
    {
      des: 'Remove secret key which not allow access api without login',
      extends: '#authRequestByToken',
      disabled: false,
      doc: { group: 'account' },
      method: 'DELETE',
      url: 'http://service.clipvnet.com/oauth/Secretkey'
    },
    {
      extends: ['#ping', '#authRequestBySecretkey'],
      disabled: false
    },
    {
      des: 'Update user information',
      extends: '#authRequestByToken',
      disabled: false,
      doc: { group: 'account' },
      method: 'PUT',
      url: 'http://service.clipvnet.com/oauth/me',
      body: {
        more: {
          fullname: 'Updated name'
        }
      }
    },
    {
      des: 'Get user information',
      extends: '#authRequestByToken',
      disabled: false,
      doc: { group: 'account' },
      method: 'GET',
      url: 'http://service.clipvnet.com/oauth/me',
      var: 'me'
    },
    {
      des: 'Get user roles which grant permission for web, api or mobile',
      extends: '#authRequestByToken',
      disabled: false,
      doc: { group: 'account' },
      method: 'GET',
      url: 'http://service.clipvnet.com/oauth/MyRoles?type=web',
      var: 'roles'
    },
    {
      des: 'Logout',
      extends: '#authRequestByToken',
      disabled: false,
      doc: { group: 'account' },
      method: 'GET',
      url: 'http://service.clipvnet.com/oauth/logout'
    },
    {
      extends: '#ping',
      disabled: false
    }
  ]
} as Testcase
