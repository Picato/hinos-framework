const HOST = 'http://service.clipvnet.com'

export default {
  disabled: true,
  des: 'Declare template apis',
  var: {
    '$$pj': '597aaa573f91b427e66ab09d',
    '$$role': '597ab2773f91b427e66ab0a5',
    '$$user': { username: 'testuser', password: 'test123' },
    '$$admin': { username: 'thanhdt', password: '123' }
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
      url: `${HOST}/oauth/ping`
    }, { key: '#ping', extends: '#authRequestByToken' }),
    API('Login by admin account', {
      url: POST(`${HOST}/oauth/Login`),
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
    }, { key: '#login' })
  ]
} as Testcase
