export default {
  des: 'APIs for file api service',
  apis: [
    API('Login', {
      url: POST('http://localhost:6110/oauth/Login'),
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
    ...INCLUDE('doc/file/fileconfig.part')
  ]
} as Testcase
