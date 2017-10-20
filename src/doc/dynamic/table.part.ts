import { TAG, HOST } from '../common'

const GROUP = 'TABLE'
const i18doc = {
  '*._id': 'Table ID',
  '*.name': 'Table name. <code>Its name must be <b>alphanumeric</b></code>'
}

export default [
  DOC('Add new table', GROUP, TAG.ADMIN, {
    i18doc: Object.assign({}, i18doc, {
      'body.name': DOC.required()
    }),
    url: POST(`${HOST.DYNAMIC}/dynamic/table`),
    body: {
      name: 'Pref'
    },
    var: {
      'newtable': $var('this.$body')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Get list tables', GROUP, TAG.ADMIN, {
    i18doc,
    url: GET(`${HOST.DYNAMIC}/dynamic/table`)
  }, { extends: '#authRequestByToken' }),

  ...INCLUDE('doc/dynamic/dynamic.part'),

  DOC('Remove table', GROUP, TAG.ADMIN, {
    url: DELETE(`${HOST.DYNAMIC}/dynamic/table/:tableId*`, $var('newtable._id'))
  }, { extends: '#authRequestByToken' })
]
