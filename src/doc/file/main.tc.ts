export default {
  des: 'Testcase for mail',
  apis: [
    API('Login', {
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
    ...INCLUDE('./doc/file/fileconfig.part')
  ]
} as Testcase
