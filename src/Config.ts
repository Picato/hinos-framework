import * as path from 'path'

export default [
  {
    title: 'Oauth APIs',
    output: path.join('src', 'doc-test.html'),
    groups: ['MEMBER', 'ROLE', 'SECRET KEY'],
    scenarios: ['./testcases/oauth/shared', './testcases/oauth/client', './testcases/oauth/admin']
  }
] as Config[]

export type Config = {
  title: string,
  output: string,
  groups?: string[],
  scenarios: string[]
}
