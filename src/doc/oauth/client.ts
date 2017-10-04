const GROUP = {
  ACCOUNT: 'ACCOUNT',
  ROLE: 'ROLE',
  PROJECT: 'PROJECT'
}
const TAG = {
  ADMIN: 'ADMIN',
  GUEST: 'GUEST'
}
export default {
  des: '[Account] Testcase for user role',
  var: {
    '$$user': { username: 'testuser', password: 'test123' }
  },
  apis: [
    DOC('Register new account for guest', GROUP.ACCOUNT, TAG.GUEST, {
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
      }
    }),
    DOC('Login', GROUP.ACCOUNT, TAG.GUEST, {
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
      }
    }, { key: '#login' }),
    DOC('Extend login timeout', GROUP.ACCOUNT, {
      extends: '#ping'
    }),
    DOC('Generate secret key which allow access api without login', GROUP.ACCOUNT, {
      extends: '#authRequestByToken',
      url: PUT('http://service.clipvnet.com/oauth/Secretkey'),
      var: {
        'secretkey': $var('this.$body')
      }
    }, { extends: '#authRequestByToken', key: '#generate-secretkey' }),
    DOC('Get secret key which allow access api without login', GROUP.ACCOUNT, {
      url: GET('http://service.clipvnet.com/oauth/Secretkey')
    }, { extends: '#authRequestBySecretkey' }),
    DOC('Remove secret key which not allow access api without login', GROUP.ACCOUNT, {
      url: DELETE('http://service.clipvnet.com/oauth/Secretkey')
    }, { extends: '#authRequestByToken' }),
    DOC('Update user information', GROUP.ACCOUNT, {
      url: PUT('http://service.clipvnet.com/oauth/me'),
      body: {
        more: {
          fullname: 'Updated name'
        }
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Get user information', GROUP.ACCOUNT, {
      url: GET('http://service.clipvnet.com/oauth/me'),
      var: {
        'me': $var('this.$body')
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Add new account', GROUP.ACCOUNT, TAG.ADMIN, {
      url: POST('http://service.clipvnet.com/oauth/account'),
      body: {
        'username': 'newuser',
        'password': 'test123',
        'recover_by': 'newuser@abc.com',
        'more': {
          'fullname': 'New name'
        },
        'project_id': $var('$$pj'),
        'role_ids': [$var('$$role')],
        'status': 1
      },
      var: {
        'newuser': $var('this.$body')
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Update exists account', GROUP.ACCOUNT, TAG.ADMIN, {
      url: PUT('http://service.clipvnet.com/oauth/account/:accountId', $var('newuser._id')),
      body: {
        'more': {
          'fullname': 'Updated name'
        }
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Get list user in the project', GROUP.ACCOUNT, TAG.ADMIN, {
      url: GET('http://service.clipvnet.com/oauth/account')
    }, { extends: '#authRequestByToken' }),
    DOC('Get user details', GROUP.ACCOUNT, TAG.ADMIN, {
      url: GET('http://service.clipvnet.com/oauth/account/:accountId', $var('newuser._id')),
      var: {
        newuser: $var('this.$body')
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Delete exists account', GROUP.ACCOUNT, TAG.ADMIN, {
      url: DELETE('http://service.clipvnet.com/oauth/account/:accountId', $var('newuser._id'))
    }, { extends: '#authRequestByToken' }),
    DOC('Get current user roles which grant permission for web, api or mobile', GROUP.ROLE, {
      url: GET('http://service.clipvnet.com/oauth/MyRoles?type=:deviceType', 'web'),
      var: {
        'roles': $var('this.$body')
      },
      doc: {
        note: `Note: Type must be in [web, mob, api]`
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Check authorization when call api', GROUP.ROLE, {
      url: HEAD('http://service.clipvnet.com/oauth/Authoriz?path=:path&actions=:actions', 'hinos-oauth-service>Me', 'GET_INFOR, UPDATE')
    }, { extends: '#authRequestByToken' }),
    DOC('Add new role', GROUP.ROLE, TAG.ADMIN, {
      url: POST('http://service.clipvnet.com/oauth/role'),
      body: {
        'name': 'newrole',
        api: [
          {
            'path': '.*',
            'actions': ['GET', 'DELETE']
          }
        ],
        web: [
          {
            'path': '/Account',
            'actions': ['GET']
          }
        ],
        mob: [
          {
            'path': '.*',
            'actions': ['.*']
          }
        ]
      },
      var: {
        'newrole': $var('this.$body')
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Update exists role', GROUP.ROLE, TAG.ADMIN, {
      url: PUT('http://service.clipvnet.com/oauth/role/:roleId', $var('newrole._id')),
      body: {
        name: 'newrole1',
        api: [
          {
            'path': '.*',
            'actions': ['.*']
          }
        ],
        web: [
          {
            'path': '/Account',
            'actions': ['GET']
          }
        ]
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Get list roles', GROUP.ROLE, TAG.ADMIN, {
      url: GET('http://service.clipvnet.com/oauth/role')
    }, { extends: '#authRequestByToken' }),
    DOC('Get role details', GROUP.ROLE, TAG.ADMIN, {
      url: GET('http://service.clipvnet.com/oauth/role/:roleId', $var('newrole._id'))
    }, { extends: '#authRequestByToken' }),
    DOC('Get project details', GROUP.PROJECT, TAG.ADMIN, {
      url: GET('http://service.clipvnet.com/oauth/project')
    }, { extends: '#authRequestByToken' }),
    DOC('Update project', GROUP.PROJECT, TAG.ADMIN, {
      url: PUT('http://service.clipvnet.com/oauth/project'),
      body: {
        des: 'updated'
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Logout', GROUP.ACCOUNT, {
      url: GET('http://service.clipvnet.com/oauth/logout')
    }, { extends: '#authRequestByToken' })
  ]
} as Testcase
