export default {
  des: '[Account] Testcase for user role',
  var: {
    '$$user': { username: 'testuser', password: 'test123' }
  },
  apis: [
    API('Register', {
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
      doc: { group: 'ACCOUNT', title: 'Register new account for guest' }
    }),
    API('Login web', {
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
      doc: { group: 'ACCOUNT', title: 'Login' }
    }, { key: '#login' }),
    {
      extends: '#ping',
      doc: { group: 'ACCOUNT', title: 'Extend login timeout' }
    },
    API('Generate secret key which allow access api without login', {
      extends: '#authRequestByToken',
      url: PUT('http://service.clipvnet.com/oauth/Secretkey'),
      var: {
        'secretkey': $var('this.$body')
      },
      doc: { group: 'SECRET KEY' }
    }, { extends: '#authRequestByToken', key: '#generate-secretkey' }),
    API('Get secret key which allow access api without login', {
      url: GET('http://service.clipvnet.com/oauth/Secretkey'),
      doc: { group: 'SECRET KEY' }
    }, { extends: '#authRequestBySecretkey' }),
    API('Remove secret key which not allow access api without login', {
      url: DELETE('http://service.clipvnet.com/oauth/Secretkey'),
      doc: { group: 'SECRET KEY' }
    }, { extends: '#authRequestByToken' }),
    API('Ping', {}, { extends: '#ping' }),
    API('Update user information', {
      url: PUT('http://service.clipvnet.com/oauth/me'),
      body: {
        more: {
          fullname: 'Updated name'
        }
      },
      doc: { group: 'ACCOUNT' }
    }, { extends: '#authRequestByToken' }),
    API('Get user information', {
      url: GET('http://service.clipvnet.com/oauth/me'),
      var: {
        'me': $var('this.$body')
      },
      doc: { group: 'ACCOUNT' }
    }, { extends: '#authRequestByToken' }),
    API('Get user roles which grant permission for web, api or mobile', {
      url: GET('http://service.clipvnet.com/oauth/MyRoles?type=:deviceType', 'web'),
      var: {
        'roles': $var('this.$body')
      },
      doc: {
        group: 'ROLE',
        note: `Note: Type must be in [web, mob, api]`
      }
    }, { extends: '#authRequestByToken' }),
    API('Logout', {
      url: GET('http://service.clipvnet.com/oauth/logout'),
      doc: { group: 'ACCOUNT' }
    }, { extends: '#authRequestByToken' }),
    '#ping'
  ]
} as Testcase
