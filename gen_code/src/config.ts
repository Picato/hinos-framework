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
        host: string,
        port: number,
        secure: boolean,
        auth: object.default({
          user: string,
          pass: string
        })
      }),
      created_at: date.auto('insert'),
      updated_at: date.auto('insert|update')
    },
    Mail: {
      _id: key,
      config_id: uuid,
      status: number.default(0),
      project_id: uuid,
      account_id: uuid,
      subject: string,
      text: string,
      html: string,
      from: string,
      to: array.default([]),
      cc: array.default([]),
      created_at: date.auto('insert'),
      updated_at: date.auto('insert|update')
    }
  }
}