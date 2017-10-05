export default {
  des: 'Testcase for user role',
  apis: [
    ...INCLUDE('./doc/oauth/account.part'),
    ...INCLUDE('./doc/oauth/role.part'),
    ...INCLUDE('./doc/oauth/project.part')
  ]
} as Testcase
