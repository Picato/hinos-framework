mongodump -d mail -c Mail -q "{'project_id': ObjectId('$1') }" -o dump
mongodump -d mail -c MailConfig -q "{'project_id': ObjectId('$1') }" -o dump
mongodump -d mail -c MailTemplate -q "{'project_id': ObjectId('$1') }" -o dump