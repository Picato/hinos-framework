use oauth
db.Account.createIndex( { "username": 1, "project_id": 1 }, { unique: true } )
db.Project.createIndex( { "uname": 1, "name": 1 }, { unique: true } )