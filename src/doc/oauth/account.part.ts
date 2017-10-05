import { TAG } from '../common'

const GROUP = 'ACCOUNT'

export default [
  DOC('Register new account for guest', GROUP, TAG.GUEST, {
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
  DOC('Login', GROUP, TAG.GUEST, {
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
  DOC('Logout', 'ACCOUNT', {
    url: GET('http://service.clipvnet.com/oauth/logout')
  }, { extends: '#authRequestByToken' }),
  '#login',
  DOC('Ping to server to extends login timeout', GROUP, {
    extends: '#ping'
  }),
  DOC('Generate secret key which allow access api without login', GROUP, {
    extends: '#authRequestByToken',
    url: PUT('http://service.clipvnet.com/oauth/Secretkey'),
    var: {
      'secretkey': $var('this.$body')
    }
  }, { extends: '#authRequestByToken', key: '#generate-secretkey' }),
  DOC('Get secret key which allow access api without login', GROUP, {
    url: GET('http://service.clipvnet.com/oauth/Secretkey')
  }, { extends: '#authRequestBySecretkey' }),
  DOC('Remove secret key which not allow access api without login', GROUP, {
    url: DELETE('http://service.clipvnet.com/oauth/Secretkey')
  }, { extends: '#authRequestByToken' }),
  DOC('Update user information', GROUP, {
    url: PUT('http://service.clipvnet.com/oauth/me'),
    body: {
      more: {
        fullname: 'Updated name'
      }
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get user information', GROUP, {
    url: GET('http://service.clipvnet.com/oauth/me'),
    var: {
      'me': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),

  DOC('Add new account', GROUP, TAG.ADMIN, {
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
  DOC('Update exists account', GROUP, TAG.ADMIN, {
    url: PUT('http://service.clipvnet.com/oauth/account/:accountId', $var('newuser._id')),
    body: {
      'more': {
        'fullname': 'Updated name'
      }
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get list user in the project', GROUP, TAG.ADMIN, {
    url: GET('http://service.clipvnet.com/oauth/account')
  }, { extends: '#authRequestByToken' }),
  DOC('Get user details', GROUP, TAG.ADMIN, {
    url: GET('http://service.clipvnet.com/oauth/account/:accountId', $var('newuser._id')),
    var: {
      newuser: $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Delete exists account', GROUP, TAG.ADMIN, {
    url: DELETE('http://service.clipvnet.com/oauth/account/:accountId', $var('newuser._id'))
  }, { extends: '#authRequestByToken' })
] as Api[]
