import { TAG, HOST } from '../common'

const GROUP = 'FILE CONFIG'
const i18doc = {
  '*._id': 'File config ID',
  '*.name': 'File config name',
  '*.config': 'Uploading file configuration information',
  '*.config.maxSize': 'Limit uploading file size',
  '*.config.maxFile': 'Num of files can upload',
  '*.config.ext': 'File extension allow upload. <code>Eg. <b>jpe?g|png|gif</b> (or use <b>.*</b> for all files)</code>',
  '*.config.zip': 'Auto zip file in uploading progress <code>Only use <b>zip</b> OR <b>resize</b></code>',
  '*.config.resize': 'Config to auto resize images after upload <code>Only use <b>resize</b> OR <b>zip</b></code>',
  '*.config.resize.0.w': 'Image width after resize. <code>Atleast must have <b>w</b> or <b>h</b></code>',
  '*.config.resize.0.h': 'Image height after resize. <code>Atleast must have <b>w</b> or <b>h</b></code>',
  '*.config.resize.0.ext': `Prefix image name after resize. <code>Eg. <b>ext</b> = 'thumb'. File name is <b>test.jpg</b>. File after resize is <b>test.thumb.jpg</b></code>`
}

export default [
  DOC('Add file config', GROUP, TAG.ADMIN, {
    i18doc: Object.assign({}, i18doc, {
      'body.name': DOC.required(),
      'body.config': DOC.required(),
      'body.config.maxSize': DOC.required(),
      'body.config.maxFile': DOC.required(),
      'body.config.ext': DOC.required(),
      'body.config.resize.0.ext': DOC.required()
    }),
    note: [
      `Add SMTP server information for sending`
    ],
    url: POST(`${HOST.FILE}/files/config`),
    body: {
      'config': {
        'maxSize': 2046,
        'maxFile': 2,
        'ext': '.*',
        'zip': false,
        'resize': [
          { 'w': 100, 'h': 100, 'ext': 'thumb' }
        ]
      },
      'name': 'testProj'
    },
    var: {
      'newfileconfig': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Update files config', GROUP, TAG.ADMIN, {
    i18doc,
    url: PUT(`${HOST.FILE}/files/config/:fileConfigId`, $var('newfileconfig._id')),
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
    i18doc,
    url: GET(`${HOST.FILE}/files/config`)
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('doc/file/file.part'),

  DOC('Remove files config', GROUP, TAG.ADMIN, {
    url: DELETE(`${HOST.FILE}/files/config/:fileConfigId`, $var('newfileconfig._id'))
  }, { extends: '#authRequestByToken' })
]
