import { TAG, HOST } from '../common'

const GROUP = 'ACCOUNT'

export default [
  DOC('Register new account for guest', GROUP, TAG.GUEST, {
    url: POST(`${HOST.OAUTH}/oauth/register`),
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
    doc: {
      i18doc: {
        'headers.pj': DOC.type('').required
      }
    },
    var: {
      'user': $var('this.$body')
    }
  }),
  DOC('Login', GROUP, TAG.GUEST, {
    body: {
      username: $var('user.username'),
      password: $var('$$user.password')
    },
    var: {
      'token': $var('this.$headers.token')
    }
  }, { extends: '#login', key: '#userLogin' }),
  DOC('Ping to server to extends login timeout', GROUP, {
    extends: '#ping'
  }),
  DOC('Generate secret key which allow access api without login', GROUP, {
    extends: '#authRequestByToken',
    url: PUT(`${HOST.OAUTH}/oauth/Secretkey`),
    var: {
      'secretkey': $var('this.$body')
    }
  }, { extends: '#authRequestByToken', key: '#generate-secretkey' }),
  DOC('Get secret key which allow access api without login', GROUP, {
    url: GET(`${HOST.OAUTH}/oauth/Secretkey`)
  }, { extends: '#authRequestBySecretkey' }),
  DOC('Remove secret key which not allow access api without login', GROUP, {
    url: DELETE(`${HOST.OAUTH}/oauth/Secretkey`)
  }, { extends: '#authRequestByToken' }),
  DOC('Update user information', GROUP, {
    url: PUT(`${HOST.OAUTH}/oauth/me`),
    body: {
      more: {
        fullname: 'Updated name'
      }
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get user information', GROUP, {
    url: GET(`${HOST.OAUTH}/oauth/me`),
    var: {
      'me': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Logout', 'ACCOUNT', {
    url: GET(`${HOST.OAUTH}/oauth/logout`)
  }, { extends: '#authRequestByToken' }),
  API('Login by admin account', {
    var: {
      'token': $var('this.$headers.token')
    }
  }, { extends: '#login', key: '#adminLogin' }),
  DOC('Add new account', GROUP, TAG.ADMIN, {
    url: POST(`${HOST.OAUTH}/oauth/account`),
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
    url: PUT(`${HOST.OAUTH}/oauth/account/:accountId`, $var('newuser._id')),
    body: {
      'more': {
        'fullname': 'Updated name'
      }
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get list user in the project', GROUP, TAG.ADMIN, {
    url: GET(`${HOST.OAUTH}/oauth/account`)
  }, { extends: '#authRequestByToken' }),
  DOC('Get user details', GROUP, TAG.ADMIN, {
    url: GET(`${HOST.OAUTH}/oauth/account/:accountId`, $var('newuser._id')),
    var: {
      newuser: $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Delete exists account', GROUP, TAG.ADMIN, {
    url: DELETE(`${HOST.OAUTH}/oauth/account/:accountId`, $var('newuser._id'))
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('doc/oauth/role.part'),
  ...INCLUDE('doc/oauth/project.part'),

  API('Remove user after test client api', {
    url: DELETE(`${HOST.OAUTH}/oauth/account/:accountId`, $var('user._id'))
  }, { extends: '#authRequestByToken' })
] as Api[]
