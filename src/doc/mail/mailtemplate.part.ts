import { TAG, HOST } from '../common'

const GROUP = 'MAIL TEMPLATE'
const i18doc = {
  '*._id': 'Mail template ID',
  '*.config_id': 'Mail config ID',
  '*.name': 'Mail template name',
  '*.subject': DOC.des('Email subject'),
  '*.text': DOC.groupStart().des('Email text content (just use text or html)'),
  '*.html': DOC.groupEnd('OR').des('Email html content (just use html or text)'),
  '*.from': DOC.des('Email from. <code>Its value must be <b>alphabet</b>, <b>digit</b>, <b>_</b> or <b>-</b></code>')
}

export default [
  DOC('Add mail template', GROUP, TAG.ADMIN, {
    i18doc: Object.assign({}, i18doc, {
      'body.name': DOC.required(),
      'body.config_id': DOC.required(),
      'body.subject': DOC.required(),
      'body.from': DOC.required(),
      'body.text': DOC.required(),
      'body.html': DOC.required()
    }),
    note: [],
    url: POST(`${HOST.MAIL}/mail/MailTemplate`),
    body: {
      name: 'Test template',
      config_id: $var('newmailconfig._id'),
      subject: 'Test mail',
      text: 'Hello world',
      html: '<b>Hello</b> <i>world</i>',
      from: 'Tester'
    },
    var: {
      'newmailtemplate': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Update mail template', GROUP, TAG.ADMIN, {
    i18doc: Object.assign({}, i18doc, {
      'body.name': DOC.required(false),
      'body.config_id': DOC.required(false),
      'body.subject': DOC.required(false),
      'body.from': DOC.required(false),
      'body.text': DOC.required(false),
      'body.html': DOC.required(false)
    }),
    url: PUT(`${HOST.MAIL}/mail/MailTemplate/:mailTemplateId*`, $var('newmailtemplate._id')),
    body: {
      name: 'Test template 1',
      subject: 'Test mail 1',
      text: 'Hello world',
      html: '<b>Hello</b> <i>world</i>',
      from: 'TesterUpdated'
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get list mail template', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.MAIL}/mail/MailTemplate`)
  }, { extends: '#authRequestByToken' }),
  DOC('Get details mail template', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.MAIL}/mail/MailTemplate/:mailTemplateId*`, $var('newmailtemplate._id'))
  }, { extends: '#authRequestByToken' }),
  
  ...INCLUDE('doc/mail/mail.part'),

  DOC('Remove mail template', GROUP, TAG.ADMIN, {
    url: DELETE(`${HOST.MAIL}/mail/MailTemplate/:mailTemplateId*`, $var('newmailtemplate._id'))
  }, { extends: '#authRequestByToken' })
]
