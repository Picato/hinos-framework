import { TAG } from '../common'

const GROUP = 'FILE CONFIG'

export default [
  DOC('Add file config', GROUP, TAG.ADMIN, {
    url: POST('http://localhost:6112/files/config'),
    body: {
      'config': {
        'maxSize': 2046,
        'maxFile': 2,
        'ext': '.*',
        'resize': [
          { 'w': 100, 'h': 100, 'ext': 'thumb' }
        ]
      },
      'name': 'testProj'
    },
    var: {
      'newfileconfig': $var('this.$body')
    },
    doc: {
      note: [
        `Declare SMTP server for sending`
      ]
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Update files config', GROUP, TAG.ADMIN, {
    url: PUT('http://localhost:6112/files/config/:fileConfigId', $var('newfileconfig._id')),
    body: {
      'name': 'test avatar',
      'config': {
        'maxSize': 512,
        'maxFile': 1,
        'ext': 'jpe?g|png|gif',
        'resize': [
          {
            'w': 120,
            'h': 120,
            'ext': 'thumb'
          }
        ],
        'zip': false
      }
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get list files config', GROUP, TAG.ADMIN, {
    url: GET('http://localhost:6112/files/config')
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('doc/file/file.part'),

  DOC('Remove files config', GROUP, TAG.ADMIN, {
    url: DELETE('http://localhost:6112/files/config/:fileConfigId', $var('newfileconfig._id'))
  }, { extends: '#authRequestByToken' })
]
