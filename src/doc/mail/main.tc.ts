export default {
  des: 'APIs for mail api service',
  apis: [
    '#login',
    ...INCLUDE('doc/mail/mailconfig.part')
  ]
} as Testcase
