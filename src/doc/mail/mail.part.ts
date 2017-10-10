import { TAG, HOST } from '../common'

const GROUP = 'MAIL'

export default [
  DOC('Push email to queue for sending', GROUP, TAG.ADMIN, {
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
    },
    note: [
      `To send an email, you must push it to queue in mail service`,
      `Mail service will auto send your email`
    ]
  }, { extends: '#authRequestByToken' }),
  DOC('Resend an existed email', GROUP, TAG.ADMIN, {
    url: PUT(`${HOST.MAIL}/mail/resend/:mailId`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' }),
  DOC('Get email sending details', GROUP, TAG.ADMIN, {
    url: GET(`${HOST.MAIL}/mail/:mailId`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' }),
  DOC('Remove email sending', GROUP, TAG.ADMIN, {
    url: DELETE(`${HOST.MAIL}/mail/:mailId`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' })
]
