import { TAG, HOST } from '../common'

const GROUP = 'MAIL CONFIG'
const i18doc = {
  '*._id': 'Mail config ID',
  '*.name': 'Mail config name',
  '*.config': 'SMTP config',
  '*.config.auth': 'Sender email information',
  '*.config.auth.user': 'Sender email address',
  '*.config.auth.pass': 'Sender email password',
  '*.config.host': 'SMTP host',
  '*.config.port': 'SMPT port',
  '*.config.secure': 'SSL ?'
}

export default [
  DOC('Add mail config', GROUP, TAG.ADMIN, {
    i18doc: Object.assign({}, i18doc, {
      'body.name': DOC.required(),
      'body.config': DOC.required(),
      'body.config.*': DOC.required()
    }),
    note: [
      `Add SMTP server configuration for sending`,
      `<pre><label>Example</label>${JSON.stringify({
        config: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: 'youremail@gmail.com',
            pass: '******'
          }
        }
      }, null, '  ')}</pre>`
    ],
    url: POST(`${HOST.MAIL}/mail/Config`),
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
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Update mail config', GROUP, TAG.ADMIN, {
    i18doc: Object.assign({}, i18doc, {
      'body.name': DOC.required(false),
      'body.config': DOC.required(false),
      'body.config.*': DOC.required()
    }),
    url: PUT(`${HOST.MAIL}/mail/Config/:mailConfigId*`, $var('newmailconfig._id')),
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
    i18doc,
    url: GET(`${HOST.MAIL}/mail/Config`)
  }, { extends: '#authRequestByToken' }),
  DOC('Get details mail config', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.MAIL}/mail/Config/:mailConfigId*`, $var('newmailconfig._id'))
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('doc/mail/mailtemplate.part'),

  DOC('Remove mail config', GROUP, TAG.ADMIN, {
    url: DELETE(`${HOST.MAIL}/mail/Config/:mailConfigId*`, $var('newmailconfig._id'))
  }, { extends: '#authRequestByToken' })
]
