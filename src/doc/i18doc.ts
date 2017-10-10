export default {
  '*.pj': 'Project id which is created by super admin',
  'headers.role': 'Default role of user when register',
  'headers.content-type': DOC.required(),
  'headers.token': DOC.required().des('Token which is received after login'),

  '*.recover_by': 'Email which help active, reset password...',
  '*.more': 'Dynamic object which include all of user information. Eg: fullname, age, firstname...',

  '$headers.token': 'Token which help make the requests succesfully'
}
