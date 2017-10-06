import { TAG, HOST } from '../common'

const GROUP = 'PROJECT'

export default [
  '#adminLogin',
  DOC('Get project details', GROUP, TAG.ADMIN, {
    url: GET(`${HOST.OAUTH}/oauth/project`)
  }, { extends: '#authRequestByToken' }),
  DOC('Update project', GROUP, TAG.ADMIN, {
    url: PUT(`${HOST.OAUTH}/oauth/project`),
    body: {
      des: 'updated'
    }
  }, { extends: '#authRequestByToken' })
]
