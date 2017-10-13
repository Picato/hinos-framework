import { TAG, HOST } from '../common'

const GROUP = 'ROLE'
const i18doc = {
  '*._id': 'Role ID',
  '*.name': 'Role name',
  '*.api': 'Matrix role for api',
  '*.web': 'Matrix role for web',
  '*.mob': 'Matrix role for mobile',
  '*.web.0.path': 'Match path',
  '*.web.0.actions': 'Match actions',
  '*.api.0.path': 'Match path',
  '*.api.0.actions': 'Match actions',
  '*.mob.0.path': 'Match path',
  '*.mob.0.actions': 'Match actions'
}

export default [
  '#userLogin',
  DOC('Get current user roles which grant permission for web, api or mobile', GROUP, {
    i18doc,
    note: [
      `Note: Type must be in [web, mob, api]`,
      `<pre>`,
      `<b>api</b>: Filter permission for api`,
      `<b>web</b>: Filter permission for web`,
      `<b>mob</b>: Filter permission for mobile`,
      `</pre>`
    ],
    url: GET(`${HOST.OAUTH}/oauth/MyRoles?type=:deviceType*`, 'api'),
    var: {
      'roles': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Check authorization when call api', GROUP, {
    i18doc: Object.assign({}, i18doc, {
      '*.account_id': 'Account ID'
    }),
    url: HEAD(`${HOST.OAUTH}/oauth/Authoriz?path=:path*&actions=:actions*`, 'hinos-oauth-service>Me', 'GET_INFOR, UPDATE')
  }, { extends: '#authRequestByToken' }),
  '#adminLogin',
  DOC('Add new role', GROUP, TAG.ADMIN, {
    i18doc: Object.assign({}, i18doc, {
      'body.name': DOC.required()
    }),
    url: POST(`${HOST.OAUTH}/oauth/role`),
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
  DOC('Update exists role', GROUP, TAG.ADMIN, {
    i18doc,
    url: PUT(`${HOST.OAUTH}/oauth/role/:roleId*`, $var('newrole._id')),
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
  DOC('Get list roles', GROUP, TAG.ADMIN, {
    i18doc,
    note: [
      `Manual query by add "where", "sort", "fields" in querystring`,
      `<pre>?where={name: 'web'}&sort={updated_at: -1}&fields={name: 1}</pre>`
    ],
    url: GET(`${HOST.OAUTH}/oauth/role`)
  }, { extends: '#authRequestByToken' }),
  DOC('Get role details', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.OAUTH}/oauth/role/:roleId*`, $var('newrole._id'))
  }, { extends: '#authRequestByToken' })
]
