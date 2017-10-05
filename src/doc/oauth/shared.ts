export default {
  disabled: true,
  des: 'Declare template apis',
  var: {
    '$$pj': '597aaa573f91b427e66ab09d',
    '$$role': '597aaa573f91b427e66ab09e',
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
      url: 'http://service.clipvnet.com/oauth/ping'
    }, { key: '#ping', extends: '#authRequestByToken' })
  ]
} as Testcase
