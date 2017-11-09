export default {
  title: 'APIs for oauth api service',
  doc: {
    i18ignore: ['$body.native', '$body.0.native'],
    i18doc: {
      '*.pj': 'Project id which user will join in. <code>Contact to admin to get it</code>',
      '*.username': 'Username',
      '*.password': 'Password',
      'headers.role': 'Default role of user after register. <code>Contact to admin to get it</code>',
      '*.recover_by': 'Email which help active, reset password...',
      '*.fullname': DOC.type('Dynamic<any>').des('Fullname'),
      '*.phone': DOC.type('Dynamic<any>').des('Phone')
    }
  },
  apis: [
    ...INCLUDE('doc/oauth/account.part')
  ]
} as Testcase
