export default {
  title: 'APIs for file api service',
  var: {
    $$host: 'http://localhost:6100'
  },
  apis: [
    '#login',
    ...INCLUDE('doc/file/fileconfig.part')
  ]
} as Testcase
