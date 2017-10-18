import { TAG, HOST } from '../common'

const GROUP = 'LOG'

export default {
  title: 'APIs for log api service',
  doc: {
    i18doc: {
      '*.title': DOC.required().des('Title'),
      '*.status': DOC.type('Dynamic<Any>').des('Status'),
      '*.event_type': DOC.type('Dynamic<Any>').des('Event type'),
      '*._id': 'Log ID'
    }
  },
  apis: [
    '#login',
    DOC('Add new log', GROUP, TAG.ADMIN, {
      note: [
        `Push your object to log server`,
        `Top level key fields in object must be not same keywords "account_id", "project_id", "created_at", "updated_at", "_id"`
      ],
      url: POST(`${HOST.LOG}/log`),
      body: {
        title: 'Add new log',
        status: 0,
        event_type: 'ADD_LOG'
      },
      var: {
        'newlog': $var('this.$body')
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Update exists log', GROUP, TAG.ADMIN, {
      note: [
        `Push your new object to update exists log server`
      ],
      url: PUT(`${HOST.LOG}/log/:logId*`, $var('newlog._id')),
      body: {
        status: 1
      }
    }, { extends: '#authRequestByToken' }),
    DOC('Get list logs in my project', GROUP, TAG.ADMIN, {
      note: [
        `Manual query by add "where", "sort", "fields" in querystring`,
        `<pre>`,
        `?where={status: 1}&sort={updated_at: -1}&fields={title: 1}`,
        `</pre>`,
        `Search all of current user logs by add <code>?mine=true</code> in query string`
      ],
      url: GET(`${HOST.LOG}/log?mine=:mine`, 'false')
    }, { extends: '#authRequestByToken' }),
    DOC('Get details log', GROUP, TAG.ADMIN, {
      url: GET(`${HOST.LOG}/log/:logId*`, $var('newlog._id'))
    }, { extends: '#authRequestByToken' }),
    DOC('Remove log', GROUP, TAG.ADMIN, {
      url: DELETE(`${HOST.LOG}/log/:logId*`, $var('newlog._id'))
    }, { extends: '#authRequestByToken' })
  ]
} as Testcase
