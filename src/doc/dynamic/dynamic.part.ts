import { HOST } from '../common'

const GROUP = 'DYNAMIC DATA'
const i18doc = {
  '*._id': 'Dynamic ID'
}

export default [
  DOC('Add dynamic data', GROUP, {
    i18doc: Object.assign({}, i18doc, {
      'body': DOC.type('dynamic<any>'),
      'body.name': DOC.type('dynamic<any>'),
      'body.age': DOC.type('dynamic<any>')
    }),
    note: [
      `You can add any data via dynamic service.`,
      `Note: All of fields at top level must be not <code>_id</code> <code>project_id</code> <code>account_id</code> <code>created_at</code> <code>updated_at</code>`
    ],
    url: POST(`${HOST.DYNAMIC}/dynamic/Object/:table*`, $var('newtable.name')),
    body: {
      name: 'thanh',
      age: 10
    },
    var: {
      'newobject': $var('this.$body')
    }
  }, { extends: '#authRequestByToken', key: '#uploadFile' }),
  DOC('Update a dynamic object', GROUP, {
    i18doc: Object.assign({}, i18doc, {
      'body.school': DOC.type('dynamic<any>')
    }),
    note: [
      `You can update full data. The new will be replace the old one`,
      `Note: All of fields at top level must be not <code>_id</code> <code>project_id</code> <code>account_id</code> <code>created_at</code> <code>updated_at</code>`
    ],
    url: PUT(`${HOST.DYNAMIC}/dynamic/Object/:table*/:dynamicId*`, $var('newtable.name'), $var('newobject._id')),
    body: {
      school: 'hbt'
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Remove a dynamic object', GROUP, {
    url: DELETE(`${HOST.DYNAMIC}/dynamic/Object/:table*/:dynamicId*`, $var('newtable.name'), $var('newobject._id'))
  }, { extends: '#authRequestByToken' })
]
