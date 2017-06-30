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
    Project: {
      _id: key,
      name: string,
      des: string.required(false),
      status: number.default(0),
      plugins: object.default({
        oauth: {
          single_mode: true,
          session_expired: 15 * 60,
          is_verify: true
        }
      }),
      created_at: date.auto('insert'),
      updated_at: date.auto('insert|update')
    },
    Account: {
      _id: key,
      username: string,
      password: string,
      project_id: uuid,
      status: number.default(0),
      recover_by: string,
      role_ids: array.required(false),
      more: object.default({}),
      secret_key: string.required(false),
      created_at: date.auto('insert'),
      updated_at: date.auto('insert|update')
    },
    Role: {
      _id: key,
      name: string,
      api: array.default([]),
      web: array.default([]),
      mob: array.default([]),
      created_at: date.auto('insert'),
      updated_at: date.auto('insert|update')
    }
  }
}