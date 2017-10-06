import { TAG } from '../common'

const GROUP = 'LOG'

export default {
  des: 'APIs for log api service',
  apis: [
    API('Login', {
      url: POST('http://localhost:6110/oauth/Login'),
      headers: {
        pj: $var('$$pj')
      },
      body: {
        username: $var('$$admin.username'),
        password: $var('$$admin.password')
      },
      var: {
        'token': $var('this.$headers.token')
      }
    }, { key: '#login' }),
    DOC('Add new log', GROUP, TAG.ADMIN, {
      url: POST('http://localhost:6114/log'),
      body: {
        title: 'Add new log',
        status: 0,
        event_type: 'ADD_LOG'
      },
      var: {
        'newlog': $var('this.$body')
      },
      doc: {
        note: [
          `Push your object to log server`,
          `Top level key fields in object must be not same keywords "account_id", "project_id", "created_at", "updated_at", "_id"`
        ]
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Update exists log', GROUP, TAG.ADMIN, {
      url: PUT('http://localhost:6114/log/:logId', $var('newlog._id')),
      body: {
        status: 1
      },
      doc: {
        note: [
          `Push your new object to update exists log server`
        ]
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Get list logs in my project', GROUP, TAG.ADMIN, {
      url: GET('http://localhost:6114/log?mine=:mine', 'false'),
      doc: {
        note: [
          `Manual query by add "where", "sort", "fields" in querystring`,
          `  Eg: ?where={status: 1}&sort={updated_at: -1}&fields={title: 1}`
        ]
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Get details log', GROUP, TAG.ADMIN, {
      url: GET('http://localhost:6114/log/:logId', $var('newlog._id'))
    }, { extends: '#authRequestByToken' }),
    DOC('Remove log', GROUP, TAG.ADMIN, {
      url: DELETE('http://localhost:6114/log/:logId', $var('newlog._id'))
    }, { extends: '#authRequestByToken' })
  ]
} as Testcase
