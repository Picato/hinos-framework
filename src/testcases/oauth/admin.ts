import { Testcase } from '../../Testcase'
import { $var } from '../../Eval'

const user = {
  username: 'testuser',
  password: 'test123'
}

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
    }
  ]
} as Testcase
