import { TAG, HOST } from '../common'

const GROUP = 'MAIL'
const i18doc = {
  '*._id': 'Mail ID',
  '*.config_id': 'Mail config ID',
  '*.status': 'Email sending status. <code><b>PENDING</b>: 0, <b>PASSED</b>: 1, <b>FAILED</b>: -3, <b>ERROR</b>: [-1, -2]</code>',
  '*.subject': DOC.required().des('Email subject'),
  '*.text': DOC.des('Email text content (just use text or html)'),
  '*.html': DOC.des('Email html content (just use html or text)'),
  '*.from': DOC.required().des('Email from'),
  '*.to': DOC.required().des('Send to (emails)'),
  '*.cc': DOC.des('CC to (emails)'),
  '*.attachments': DOC.des('Email attachments. It\'s link')
}

export default [
  DOC('Send an email', GROUP, TAG.ADMIN, {
    i18doc,
    note: [
      `To send an email, you must push it to queue in mail service`,
      `Mail service will auto send your email`
    ],
    url: POST(`${HOST.MAIL}/mail/send/:mailConfigId`, $var('newmailconfig._id')),
    body: {
      subject: 'Test mail',
      text: 'Hello world',
      html: '<b>Hello</b> <i>world</i>',
      from: 'Tester@abc.com',
      to: ['user1@abc.com'],
      cc: ['user2@abc.com'],
      attachments: ['http://www.logoeps.com/wp-content/uploads/2011/02/youtube-logo-vector.png']
    },
    var: {
      'newmail': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Resend an existed email', GROUP, TAG.ADMIN, {
    i18doc,
    url: PUT(`${HOST.MAIL}/mail/resend/:mailId`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' }),
  DOC('Get list emails', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.MAIL}/mail`)
  }, { extends: '#authRequestByToken' }),
  DOC('Get an email sending details', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.MAIL}/mail/:mailId`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' }),
  DOC('Remove an email sending', GROUP, TAG.ADMIN, {
    i18doc,
    url: DELETE(`${HOST.MAIL}/mail/:mailId`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' })
]
