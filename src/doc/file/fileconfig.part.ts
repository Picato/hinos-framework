import { TAG } from '../common'

const GROUP = 'MAIL CONFIG'

export default [
  DOC('Add file config', GROUP, TAG.ADMIN, {
    url: POST('http://service.clipvnet.com/files/config'),
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
    url: PUT('http://service.clipvnet.com/files/config/:fileConfigId', $var('newfileconfig._id')),
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
    url: GET('http://service.clipvnet.com/files/config')
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('./doc/file/file.part'),

  DOC('Remove files config', GROUP, TAG.ADMIN, {
    url: DELETE('http://service.clipvnet.com/files/config/:fileConfigId', $var('newfileconfig._id'))
  }, { extends: '#authRequestByToken' })
]
