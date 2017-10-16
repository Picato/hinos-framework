export default {
  'headers.content-type': DOC.required(),
  'headers.token': DOC.required().des('Token which is received after login successfully'),

  '$headers.token': 'Token which help make the requests succesfully',

  '*.account_id': 'Creator or lastest updator ID',
  '*.project_id': 'Project ID',
  '*.created_at': 'Created time',
  '*.updated_at': 'Updated time'
}
