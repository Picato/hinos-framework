export default {
  disabled: true,
  des: 'Declare template apis',
  var: {
    '$$pj': '595c7179d28ff924b0f5c623',
    '$$role': '5976b908620f4a1f34bc3d12',
    '$$user': { username: 'testuser', password: 'test123' },
    '$$admin': { username: 'admin', password: '123' }
  },
  apis: [
    API('Template request with token', {
      headers: {
        token: $var('token')
      }
    }, { key: '#authRequestByToken' }),
    API('Template request with secret key', {
      headers: {
        token: $var('secretkey')
      }
    }, { key: '#authRequestBySecretkey' }),
    API('Template ping with token', {
      method: 'HEAD',
      url: 'http://localhost:6111/oauth/ping'
    }, { key: '#ping', extends: '#authRequestByToken' }),
    API('Login by admin account', {
      url: POST('http://localhost:6111/oauth/Login'),
      headers: {
        pj: $var('$$pj')
      },
      body: {
        username: $var('$$user.username'),
        password: $var('$$user.password')
      },
      var: {
        'token': $var('this.$headers.token')
      }
    }, { key: '#login' })
  ]
} as Testcase
