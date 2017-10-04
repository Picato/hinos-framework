import * as path from 'path'

export default [
  {
    title: 'Oauth APIs',
    output: path.join('src', 'doc-test.html'),
    groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
    scenarios: ['./doc/oauth/shared', './doc/oauth/client', './doc/oauth/admin']
  }
] as Config[]

export type Config = {
  title: string,
  output: string,
  groups?: string[],
  scenarios: string[]
}
