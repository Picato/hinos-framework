import array from './lib/array.type';
import boolean from './lib/boolean.type';
import date from './lib/date.type';
import file from './lib/file.type';
import key from './lib/key.type';
import number from './lib/number.type';
import object from './lib/object.type';
import string from './lib/string.type';
import uuid from './lib/uuid.type';

export namespace generation {
  export const Auth = true;
  export const Tables = {
    Config: {
      _id: key,
      project_id: uuid,
      account_id: uuid,
      name: string,
      config: object.default({
        maxSize: 2046,
        maxFile: 2,
        ext: '.*'
      }),
      created_at: date.auto('insert'),
      updated_at: date.auto('insert|update')
    },
    Files: {
      _id: key,
      config_id: uuid,
      project_id: uuid,
      account_id: uuid,
      links: file.config([{
        returnType: String, // [String] return only path, [Object] return full object file
        returnPath: 'images/', // Return path after uploaded
        name: 'images', // Field name
        uploadDir: 'assets/images', // absolute path where file will be saved to
        maxCount: 2
      }]),
      link: string,
      created_at: date.auto('insert'),
      updated_at: date.auto('insert|update')
    }
  }
}