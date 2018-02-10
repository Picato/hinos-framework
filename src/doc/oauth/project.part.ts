import { TAG, HOST } from '../common'

const GROUP = 'PROJECT'
const i18doc = {
  '*._id': 'Project ID',
  '*.name': 'Project name',
  '*.des': 'Project description',
  '*.plugins': 'Project configuration',
  '*.plugins.oauth': 'Oauth configuration',
  '*.plugins.oauth.single_mode': 'Only 1 account is online in the same time',
  '*.plugins.oauth.session_expired': 'Login session timeout (<b>ms</b>)',
  '*.plugins.oauth.is_verify': `Verify account after register. If it's <b>true</b> then account must be <b>actived by email</b> which sent to user email after register`,
  '*.plugins.oauth.app': 'Login via social network. <code><b>facebook</b>: login via facebook. <b>google</b>: login via google+</code>'
}

export default [
  '#adminLogin',
  DOC('Get project details', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.OAUTH}/oauth/Project`)
  }, { extends: '#authRequestByToken' }),
  DOC('Update project', GROUP, TAG.ADMIN, {
    i18doc: Object.assign({}, i18doc, {
      'body.plugins.*': DOC.required()
    }),
    url: PUT(`${HOST.OAUTH}/oauth/Project`),
    body: {
      name: 'Developer',
      des: 'updated 1',
      plugins: {
        oauth: {
          single_mode: false,
          session_expired: 2700,
          is_verify: false,
          app: []
        }
      }
    }
  }, { extends: '#authRequestByToken' })
]
