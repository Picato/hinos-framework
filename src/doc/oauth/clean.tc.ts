export default {
  des: 'Clean',
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
    API('Remove user after test client api', {
      url: DELETE('http://service.clipvnet.com/oauth/account/:accountId', $var('user._id'))
    }, { extends: '#authRequestByToken' })
  ]
} as Testcase
