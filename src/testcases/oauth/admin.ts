export default {
  des: '[Account] Testcase for admin role',
  var: {
    '$$admin': { username: 'testuser', password: 'test123' }
  },
  apis: [
    API('Admin login', {
      url: POST('http://service.clipvnet.com/oauth/Login'),
      headers: {
        pj: $var('$$pj')
      },
      body: {
        username: $var('$$admin.username'),
        password: $var('$$admin.password')
      },
      var: {
        'token': $var('this.$headers.token')
      }
    }, { key: '#login' }),
    API('Check authorization when call api', {
      url: HEAD('http://service.clipvnet.com/oauth/Authoriz?path=:path&actions=:actions', 'hinos-oauth-service>Me', 'GET_INFOR, UPDATE'),
      doc: { group: 'Admin Account' }
    }, { extends: '#authRequestByToken' }),
    API('Remove user after test client api', {
      url: DELETE('http://service.clipvnet.com/oauth/account/:accountId', $var('user._id')),
      doc: { group: 'Admin Account', title: 'Delete user account' }
    }, { extends: '#authRequestByToken' })
  ]
} as Testcase
