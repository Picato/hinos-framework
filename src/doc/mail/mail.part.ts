import { TAG } from '../common'

const GROUP = 'MAIL'

export default [
  DOC('Push email to queue for sending', GROUP, TAG.ADMIN, {
    url: POST('http://service.clipvnet.com/mail/send/:mailConfigId', $var('newmailconfig._id')),
    body: {
      subject: 'Test mail',
      text: 'Hello world',
      from: 'Tester@abc.com',
      to: ['user1@abc.com'],
      cc: ['user2@abc.com'],
      attachments: ['http://www.logoeps.com/wp-content/uploads/2011/02/youtube-logo-vector.png']
    },
    var: {
      'newmail': $var('this.$body')
    },
    doc: {
      note: [
        `To send an email, you must push your email to mail server`
      ]
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Resend email', GROUP, TAG.ADMIN, {
    url: PUT('http://service.clipvnet.com/mail/resend/:mailId', $var('newmail._id')),
    doc: {
      note: [
        `Push your new object to update exists log server`
      ]
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get details mail', GROUP, TAG.ADMIN, {
    url: GET('http://service.clipvnet.com/mail/:mailId', $var('newmail._id'))
  }, { extends: '#authRequestByToken' }),
  DOC('Remove mail', GROUP, TAG.ADMIN, {
    url: DELETE('http://service.clipvnet.com/mail/:mailId', $var('newmail._id'))
  }, { extends: '#authRequestByToken' })
]
