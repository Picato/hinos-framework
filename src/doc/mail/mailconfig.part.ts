import { TAG } from '../common'

const GROUP = 'MAIL CONFIG'

export default [
  DOC('Add mail config', GROUP, TAG.ADMIN, {
    url: POST('http://service.clipvnet.com/mail/config'),
    body: {
      name: 'Test Account',
      config: {
        auth: {
          user: 'clipvnet@gmail.com',
          pass: 'thanh@#$1234'
        },
        pass: 'thanh@#$1234',
        user: 'clipvnet@gmail.com',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true
      }
    },
    var: {
      'newmailconfig': $var('this.$body')
    },
    doc: {
      note: [
        `Declare SMTP server for sending`
      ]
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Update mail config', GROUP, TAG.ADMIN, {
    url: PUT('http://service.clipvnet.com/mail/config/:mailConfigId', $var('newmailconfig._id')),
    body: {
      name: 'Test Account Updated',
      config: {
        auth: {
          user: 'clipvnet@gmail.com',
          pass: 'thanh@#$1234'
        },
        pass: 'thanh@#$1234',
        user: 'clipvnet@gmail.com',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true
      }
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get list mail config', GROUP, TAG.ADMIN, {
    url: GET('http://service.clipvnet.com/mail/config')
  }, { extends: '#authRequestByToken' }),
  DOC('Get details mail config', GROUP, TAG.ADMIN, {
    url: GET('http://service.clipvnet.com/mail/config/:mailConfigId', $var('newmailconfig._id'))
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('./doc/mail/mail.part'),

  DOC('Remove mail config', GROUP, TAG.ADMIN, {
    url: DELETE('http://service.clipvnet.com/mail/config/:mailConfigId', $var('newmailconfig._id'))
  }, { extends: '#authRequestByToken' })
]
