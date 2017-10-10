import { TAG, HOST } from '../common'

const GROUP = 'MAIL CONFIG'

export default [
  DOC('Add mail config', GROUP, TAG.ADMIN, {
    url: POST(`${HOST.MAIL}/mail/config`),
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
      i18doc: {
        'body.config': DOC.required(),
        'body.config.*': DOC.required()
      },
      note: [
        `Declare SMTP server for sending`
      ]
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Update mail config', GROUP, TAG.ADMIN, {
    url: PUT(`${HOST.MAIL}/mail/config/:mailConfigId`, $var('newmailconfig._id')),
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
    },
    doc: {
      i18doc: {
        'body.config.*': DOC.required()
      }
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get list mail config', GROUP, TAG.ADMIN, {
    url: GET(`${HOST.MAIL}/mail/config`)
  }, { extends: '#authRequestByToken' }),
  DOC('Get details mail config', GROUP, TAG.ADMIN, {
    url: GET(`${HOST.MAIL}/mail/config/:mailConfigId`, $var('newmailconfig._id'))
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('doc/mail/mail.part'),

  DOC('Remove mail config', GROUP, TAG.ADMIN, {
    url: DELETE(`${HOST.MAIL}/mail/config/:mailConfigId`, $var('newmailconfig._id'))
  }, { extends: '#authRequestByToken' })
]
