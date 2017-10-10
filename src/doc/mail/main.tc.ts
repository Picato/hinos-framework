export default {
  des: 'APIs for mail api service',
  doc: {
    i18doc: {
      // Mail config
      'body.name': DOC.required(),
      '*.config': 'SMTP config',
      '*.config.auth': 'Sender email information',
      '*.config.auth.user': 'Sender email address',
      '*.config.auth.pass': 'Sender email password',
      '*.config.host': 'SMTP host',
      '*.config.port': 'SMPT port',
      '*.config.secure': 'SSL ?',
      // Mail
      '*.subject': DOC.required().des('Email subject'),
      '*.text': DOC.required().des('Email text content (just use text or html)'),
      '*.html': DOC.required().des('Email html content (just use html or text)'),
      '*.from': DOC.required().des('Email from'),
      '*.to': DOC.required().des('Send to (emails)'),
      '*.cc': DOC.required().des('CC to (emails)'),
      '*.attachments': DOC.required().des('Email attachments. It\'s link')
    }
  },
  apis: [
    '#login',
    ...INCLUDE('doc/mail/mailconfig.part')
  ]
} as Testcase
