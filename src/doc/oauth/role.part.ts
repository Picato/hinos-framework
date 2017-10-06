import { TAG } from '../common'

const GROUP = 'ROLE'

export default [
  '#userLogin',
  DOC('Get current user roles which grant permission for web, api or mobile', GROUP, {
    url: GET('http://localhost:6111/oauth/MyRoles?type=:deviceType', 'web'),
    var: {
      'roles': $var('this.$body')
    },
    doc: {
      note: `Note: Type must be in [web, mob, api]`
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Check authorization when call api', GROUP, {
    url: HEAD('http://localhost:6111/oauth/Authoriz?path=:path&actions=:actions', 'hinos-oauth-service>Me', 'GET_INFOR, UPDATE')
  }, { extends: '#authRequestByToken' }),
  '#adminLogin',
  DOC('Add new role', GROUP, TAG.ADMIN, {
    url: POST('http://localhost:6111/oauth/role'),
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
    url: PUT('http://localhost:6111/oauth/role/:roleId', $var('newrole._id')),
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
    url: GET('http://localhost:6111/oauth/role')
  }, { extends: '#authRequestByToken' }),
  DOC('Get role details', GROUP, TAG.ADMIN, {
    url: GET('http://localhost:6111/oauth/role/:roleId', $var('newrole._id'))
  }, { extends: '#authRequestByToken' })
]
