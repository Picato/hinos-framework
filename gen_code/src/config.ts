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
    Component: {
      _id: key,
      project_id: uuid,
      account_id: uuid,
      file: string,
      des: string,
      group: string,
      created_at: date.auto('insert'),
      updated_at: date.auto('insert|update')
    }
  }
}