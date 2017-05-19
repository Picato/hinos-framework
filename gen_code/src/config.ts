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
        test: {
            _id: key,
            project_id: uuid.required(false),
            name: string,
            age: number,
            shared: boolean,
            arr: array.schema({
                name: string,
                people: array.schema({
                    name1: string,
                    age1: number
                })
            }),
            obj: object.required(false).schema({
                name: string.required(false),
                age: number,
                obj1: object.schema({
                    b: number
                }).default({
                    b: 10
                })
            }),
            file: file.required(false).config({
                uploadDir: "assets/images", // not specify it will write raw data
                returnPath: 'images/',
                returnType: String,
                length: 2, // Num of files     
                resize: [
                    {w: -1000 }, // Auto resize origin when width > 1000. If width < 1000 do nothing
                    {w: 32, h: 32, ext: 'thumb'},
                    {w: 224, h: 200, ext: 'list.pc'},
                    {w: 358, h: 200, ext: 'list.tab'},
                    {w: 270, h: 200, ext: 'list.mob'}
                ] // Auto resize image base on config in src/appconfig.js
            }),
            created_at: date.auto('insert'),
            updated_at: date.auto('insert|update')
        }
    }
}