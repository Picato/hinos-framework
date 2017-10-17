import { TAG, HOST } from '../common'

const GROUP = 'ACCOUNT'
const i18doc = {
  '*._id': 'Account ID',
  '*.role_ids': 'User role IDs',
  '*.project_id': 'Project ID',
  '*.status': 'Account status. <code><b>ACTIVED</b>: 1, <b>INACTIVED</b>: 0, <b>LOCKED</b>: -1</code>',
  '*.app': 'Login via social network. <code><b>facebook</b>: Login via facebook. <b>google</b>: Login via google+</code>'
}

export default [
  DOC('Register new account for guest', GROUP, TAG.GUEST, {
    i18doc: Object.assign({}, i18doc, {
      'headers.pj': DOC.required(),
      'headers.role': DOC.required(),
      'body.username': DOC.required(),
      'body.password': DOC.required(),
      'body.recover_by': DOC.required()
    }),
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
    var: {
      'user': $var('this.$body')
    }
  }),
  DOC('Login', GROUP, TAG.GUEST, {
    i18doc: Object.assign({}, i18doc, {
      'headers.pj': DOC.required(),
      'body.username': DOC.groupStart().required(),
      'body.password': DOC.groupEnd().required(),
      'body.app': DOC.groupStart('OR').required(),
      'body.token': DOC.groupEnd().required().des('Facebook or google+ token')
    }),
    note: [
      `We have 2 ways to login`,
      `1. Login by account in system. You need to fill username, password fields`,
      `2. Login via social network (Eg. facebook, google+...). You need to fill app and token (facebook token or google+ token)`
    ],
    body: {
      username: $var('user.username'),
      password: $var('$$user.password'),
      app: 'facebook',
      token: 'Facebook token'
    },
    var: {
      'token': $var('this.$headers.token')
    }
  }, { extends: '#login', key: '#userLogin' }),
  DOC('Ping to server to extends login timeout', GROUP, {
    extends: '#ping'
  }),
  DOC('Generate secret key which allow access api without login', GROUP, {
    i18doc: {
      '$body': 'Secret token key. Use it to make call to api service which never is expired'
    },
    extends: '#authRequestByToken',
    url: PUT(`${HOST.OAUTH}/oauth/Secretkey`),
    var: {
      'secretkey': $var('this.$body')
    }
  }, { extends: '#authRequestByToken', key: '#generate-secretkey' }),
  DOC('Get secret key which allow access api without login', GROUP, {
    i18doc: {
      '$body': 'Secret token key. Use it to make call to api service which never is expired'
    },
    url: GET(`${HOST.OAUTH}/oauth/Secretkey`)
  }, { extends: '#authRequestBySecretkey' }),
  DOC('Remove secret key which not allow access api without login', GROUP, {
    url: DELETE(`${HOST.OAUTH}/oauth/Secretkey`)
  }, { extends: '#authRequestByToken' }),
  DOC('Update user information', GROUP, {
    i18doc,
    url: PUT(`${HOST.OAUTH}/oauth/me`),
    body: {
      password: $var('$$user.password'),
      recover_by: 'abc123@abc.com',
      more: {
        fullname: 'Updated name'
      }
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get user information', GROUP, {
    i18doc,
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
    i18doc: Object.assign({}, i18doc, {
      'body.username': DOC.required(),
      'body.password': DOC.required(),
      'body.status': DOC.required(),
      'body.recover_by': DOC.required(),
      'body.role_ids': DOC.required()
    }),
    url: POST(`${HOST.OAUTH}/oauth/account`),
    body: {
      'username': 'newuser',
      'password': 'test123',
      'status': 1,
      'recover_by': 'newuser@abc.com',
      'more': {
        'fullname': 'New name'
      },
      'role_ids': [$var('$$role')]
    },
    var: {
      'newuser': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Update exists account', GROUP, TAG.ADMIN, {
    i18doc,
    url: PUT(`${HOST.OAUTH}/oauth/account/:accountId*`, $var('newuser._id')),
    body: {
      'password': 'test123',
      'status': 1,
      'recover_by': 'newuser@abc.com',
      'more': {
        'fullname': 'New name'
      },
      'role_ids': [$var('$$role')]
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get list user in the project', GROUP, TAG.ADMIN, {
    i18doc,
    note: [
      `Manual query by add "where", "sort", "fields" in querystring`,
      `<pre>?where={status: 1}&sort={updated_at: -1}&fields={username: 1}</pre>`
    ],
    url: GET(`${HOST.OAUTH}/oauth/account`)
  }, { extends: '#authRequestByToken' }),
  DOC('Get user details', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.OAUTH}/oauth/account/:accountId*`, $var('newuser._id')),
    var: {
      newuser: $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('doc/oauth/role.part'),
  ...INCLUDE('doc/oauth/project.part'),

  DOC('Delete an exists account', GROUP, TAG.ADMIN, {
    url: DELETE(`${HOST.OAUTH}/oauth/account/:accountId*`, $var('newuser._id'))
  }, { extends: '#authRequestByToken' }),

  API('Remove user after test client api', {
    url: DELETE(`${HOST.OAUTH}/oauth/account/:accountId`, $var('user._id'))
  }, { extends: '#authRequestByToken' })
] as Api[]
