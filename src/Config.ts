import * as path from 'path'

export default [
  {
    title: 'Oauth APIs',
    des: 'Manage authentication, authorization, role, project',
    output: path.join('..', 'service-quickstart', 'oauth', 'assets', 'doc.html'),
    groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
    scenarios: ['./doc/oauth/shared', './doc/oauth/main.tc']
  },
  {
    title: 'Log APIs',
    des: 'Manage log',
    output: path.join('..', 'service-quickstart', 'log', 'assets', 'doc.html'),
    groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
    scenarios: ['./doc/oauth/shared', './doc/log/main.tc']
  },
  {
    title: 'Dynamic APIs',
    des: 'Allow create and push dynamic data to server via tables',
    output: path.join('..', 'service-quickstart', 'dynamic', 'assets', 'doc.html'),
    groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
    scenarios: ['./doc/oauth/shared', './doc/dynamic/main.tc']
  },
  {
    title: 'Mail APIs',
    des: 'Manage mail config, mail and mail sending',
    output: path.join('..', 'service-quickstart', 'mail', 'assets', 'doc.html'),
    groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
    scenarios: ['./doc/oauth/shared', './doc/mail/main.tc']
  },
  {
    title: 'File APIs',
    des: 'Manage file config, file upload, auto resize, auto zip ...',
    output: path.join('..', 'service-quickstart', 'files', 'assets', 'doc.html'),
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
