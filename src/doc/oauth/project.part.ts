import { TAG } from '../common'

const GROUP = 'PROJECT'

export default [
  DOC('Get project details', GROUP, TAG.ADMIN, {
    url: GET('http://service.clipvnet.com/oauth/project')
  }, { extends: '#authRequestByToken' }),
  DOC('Update project', GROUP, TAG.ADMIN, {
    url: PUT('http://service.clipvnet.com/oauth/project'),
    body: {
      des: 'updated'
    }
  }, { extends: '#authRequestByToken' })
]
