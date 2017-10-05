import * as path from 'path'

export default [
  // {
  //   title: 'Oauth APIs',
  //   des: 'Manage oauth apis',
  //   output: path.join('src', 'doc-test.html'),
  //   groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
  //   scenarios: ['./doc/oauth/shared', './doc/oauth/main.tc', './doc/oauth/clean.tc']
  // }
  // {
  //   title: 'Log APIs',
  //   des: 'Manage log apis',
  //   output: path.join('src', 'doc-test.html'),
  //   groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
  //   scenarios: ['./doc/oauth/shared', './doc/log/main.tc']
  // }
  // {
  //   title: 'Mail APIs',
  //   des: 'Manage mail apis',
  //   output: path.join('src', 'doc-test.html'),
  //   groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
  //   scenarios: ['./doc/oauth/shared', './doc/mail/main.tc']
  // }
  {
    title: 'File APIs',
    des: 'Manage file apis',
    output: path.join('src', 'doc-test.html'),
    groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
    scenarios: ['./doc/oauth/shared', './doc/file/main.tc']
  }
] as Config[]

export type Config = {
  title: string,
  des: string,
  output: string,
  groups?: string[],
  scenarios: string[]
}
