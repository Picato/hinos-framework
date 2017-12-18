import { TAG, HOST } from '../common'

const GROUP = 'MAIL'
const i18doc = {
  '*._id': 'Mail ID',
  '*.config_id': 'Mail config ID',
  '*.status': 'Email sending status. <code><b>PENDING</b>: 0, <b>PASSED</b>: 1, <b>FAILED</b>: -3, <b>ERROR</b>: [-1, -2]</code>',
  '*.subject': DOC.required().des('Email subject'),
  '*.text': DOC.required().groupStart().des('Email text content (just use text or html)'),
  '*.html': DOC.required().groupEnd('OR').des('Email html content (just use html or text)'),
  '*.from': DOC.required().des('Email from. <code>Its value must be <b>alphabet</b>, <b>digit</b>, <b>_</b> or <b>-</b></code>'),
  '*.to': DOC.required().des('Send to (emails)'),
  '*.cc': DOC.des('CC to (emails)'),
  '*.attachments': DOC.des('Email attachments. It\'s link')
}

export default [
  DOC('Send an email via mail config', GROUP, TAG.ADMIN, {
    i18doc,
    note: [
      `To send an email, you must push it to queue in mail service`,
      `Mail service will auto send your email`
    ],
    url: POST(`${HOST.MAIL}/mail/Send/:mailConfigId*`, $var('newmailconfig._id')),
    body: {
      subject: 'Test mail',
      text: 'Hello world',
      html: '<b>Hello</b> <i>world</i>',
      from: 'Tester',
      to: ['user1@abc.com'],
      cc: ['user2@abc.com'],
      attachments: ['http://www.logoeps.com/wp-content/uploads/2011/02/youtube-logo-vector.png']
    },
    var: {
      'newmail': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  API('Add file config', {
    url: POST(`${HOST.FILE}/files/Config`),
    body: {
      'config': {
        'maxSize': 512,
        'maxFile': 1,
        'ext': '.*',
        'expiredTime': 300,
        'zip': false
      },
      'name': 'testSendmail'
    },
    var: {
      'newfileconfig': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  API('Upload file', {
    url: POST(`${HOST.FILE}/files/Upload/:fileConfigId*`, $var('newfileconfig._id')),
    headers: {
      'content-type': 'multipart/form-data'
    },
    body: {
      files: Part(`C:\\test.jpg`)
    },
    var: {
      'newfile': $var('this.$body')
    }
  }, { extends: '#authRequestByToken', key: '#uploadFile' }),
  DOC('Send an email via mail template', GROUP, TAG.ADMIN, {
    i18doc,
    note: [
      `To send an email, you must push it to queue in mail service`,
      `Mail service will auto send your email`,
      `The email will be auto apply email template to send to user`
    ],
    url: PUT(`${HOST.MAIL}/mail/Send/:mailTemplateId*`, $var('newmailtemplate._id')),
    body: {
      to: ['doanthuanthanh88@gmail.com'],
      cc: ['thanhdt611@gmail.com'],
      attachments: [
        { fileserv: $var('newfile') }
      ]
    },
    var: {
      'newmail1': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),

  DELAY(10000, 'Delay to sending mail'),

  API('Remove file', {
    url: PUT(`${HOST.FILE}/files/Remove`),
    body: {
      files: $var('newfile')
    }
  }, { extends: '#authRequestByToken' }),
  API('Remove files config', {
    url: DELETE(`${HOST.FILE}/files/Config/:fileConfigId*`, $var('newfileconfig._id'))
  }, { extends: '#authRequestByToken' }),
  DOC('Resend an existed email', GROUP, TAG.ADMIN, {
    i18doc,
    url: PUT(`${HOST.MAIL}/mail/Resend/:mailId*`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' }),
  DOC('Get list emails', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.MAIL}/mail`)
  }, { extends: '#authRequestByToken' }),
  DOC('Get an email sending details', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.MAIL}/mail/:mailId*`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' }),
  DOC('Remove an email sending', GROUP, TAG.ADMIN, {
    i18doc,
    url: DELETE(`${HOST.MAIL}/mail/:mailId*`, $var('newmail._id'))
  }, { extends: '#authRequestByToken' })
]
