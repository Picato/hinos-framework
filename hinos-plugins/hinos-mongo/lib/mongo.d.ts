import { ObjectID, Db, Collection } from 'mongodb';
export declare class Uuid extends ObjectID {
}
export declare function Collection(name?: string): Function;
export declare function MONGO(key?: string): (target: any, propertyKey: string | symbol) => void;
export declare function Mongo({url, key, releaseTimeout}: {
    url: any;
    key?: string | symbol;
    releaseTimeout?: number;
}): void;
export interface Mongo {
    size: number;
    get<T extends object>(tableName: T | string, filter: ObjectID | string | object, fields?: object): Promise<T>;
    find<T extends object>(tableName: T | string, opts: {
        $where: any;
        $fields: any;
        $sort: any;
        $page: number;
        $recordsPerPage: number;
    }): Promise<T[]>;
    insert<T extends object>(tableName: T | string, obj: T | T[]): Promise<T | T[]>;
    update<T extends object>(tableName: T | string, obj: T, opts?: {
        return?: boolean;
        multiple?: boolean;
    }): Promise<number | T>;
    delete<T extends object>(tableName: T | string, filter: string | ObjectID | object, opts?: {
        return?: boolean;
        multiple?: boolean;
    }): Promise<number | T>;
    manual<T extends object>(tableName: T | string, fcManual: (collection: Collection, db: Db) => any): Promise<any>;
    count<T extends object>(tableName: T | string, where: any): Promise<number>;
}
export declare namespace Mongo {
    function pool(key?: string | symbol): Mongo;
    function uuid(id?: any): ObjectID | ObjectID[];
}
