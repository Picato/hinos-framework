import { TAG } from '../common'

const GROUP = 'PROJECT'

export default [
  '#adminLogin',
  DOC('Get project details', GROUP, TAG.ADMIN, {
    url: GET('http://localhost:6111/oauth/project')
  }, { extends: '#authRequestByToken' }),
  DOC('Update project', GROUP, TAG.ADMIN, {
    url: PUT('http://localhost:6111/oauth/project'),
    body: {
      des: 'updated'
    }
  }, { extends: '#authRequestByToken' })
]
