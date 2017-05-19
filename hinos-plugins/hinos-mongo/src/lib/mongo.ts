import { MongoClient, ObjectID, Db, Collection, Cursor, FindOneOptions, InsertOneWriteOpResult, InsertWriteOpResult, FindAndModifyWriteOpResultObject, UpdateWriteOpResult, DeleteWriteOpResultObject } from 'mongodb';
import * as _ from 'lodash';
import { QueueHandler } from 'hinos-common/QueueHandler';

let map: { [propName: string]: Mongo } = {};
const defaultKey = Symbol('DefaultKey');

export class Uuid extends ObjectID { }

// @Collection: Declare table
export function Collection(name?: string): Function {
    return (constructor: Function) => {
        Object.defineProperty(constructor, 'toString', {
            value: () => name || constructor.name
        });
    }
}

// @MONGO: pooler
export function MONGO(key?: string) {
    return function (target: any, propertyKey: string | symbol) {
        Object.defineProperty(target, propertyKey, {
            get() {
                return Mongo.pool(key);
            }
        })
    }
}
// Mongo(): Config
export function Mongo({ url, key = <string | symbol>defaultKey, releaseTimeout = 5000 }) {
    console.info(`» Mongo ${key.toString()} is used`);
    map[key] = new MongoImpl(url, releaseTimeout);
}
export interface Mongo {
    // new (url: string, releaseTimeout?: number): Mongo;
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
        return?: boolean,
        multiple?: boolean
    }): Promise<number | T>;
    delete<T extends object>(tableName: T | string, filter: string | ObjectID | object, opts?: {
        return?: boolean,
        multiple?: boolean
    }): Promise<number | T>;
    manual<T extends object>(tableName: T | string, fcManual: (collection: Collection, db: Db) => any): Promise<any>;
    count<T extends object>(tableName: T | string, where): Promise<number>;
}
// Mongo: Helper
export namespace Mongo {
    export function pool(key = <string | symbol>defaultKey): Mongo {
        return map[key];
    }
    export function uuid(id?): ObjectID | ObjectID[] {
        if (!id) return new Uuid();
        if (id instanceof Array) {
            for (let i in id) {
                id[i] = Mongo.uuid(id[i]);
            }
            return id;
        }
        return typeof id === 'string' ? new ObjectID(id) : id;
    }
}

class MongoImpl implements Mongo {
    private queue: QueueHandler<Db>;

    constructor(url: string, releaseTimeout = 5000) {
        this.queue = new QueueHandler<Db>(() => MongoClient.connect(url), db => db.close(), releaseTimeout);
    }

    get size(): number {
        return this.queue.size;
    }

    async find<T extends object>(tableName: T | string, {
        $where = {},
        $fields = {},
        $sort = {},
        $page = 1,
        $recordsPerPage = 20
    }): Promise<T[]> {
        const db: Db = await this.queue.get();
        const collection: Collection = db.collection(tableName.toString());
        try {
            let query: Cursor<T> = collection.find($where, $fields);
            query = query.sort($sort);
            if ($page > 0) query = query.skip(($page - 1) * $recordsPerPage);
            if ($recordsPerPage > 0) query = query.limit($recordsPerPage);
            return await query.toArray();
        } finally {
            this.queue.release(db);
        }
    }

    async get<T extends object>(tableName: T | string, filter: ObjectID | string | object, fields?: object): Promise<T> {
        const db: Db = await this.queue.get();
        const collection: Collection = db.collection(tableName.toString());
        let fil = {
            $where: <any>{},
            $fields: <FindOneOptions>{}
        };
        if (filter instanceof ObjectID) fil.$where._id = filter;
        else if (typeof filter == 'string') fil.$where._id = Mongo.uuid(filter);
        else fil.$where = filter;
        if (fields) fil.$fields = fields;
        try {
            return await <Promise<T>>collection.findOne(fil.$where, fil.$fields);
        } finally {
            this.queue.release(db);
        }
    }

    async insert<T extends object>(tableName: T | string, obj: T | T[]): Promise<T | T[]> {
        const db: Db = await this.queue.get();
        const collection: Collection = db.collection(tableName.toString());
        try {
            if (!(obj instanceof Array)) {
                let rs: InsertOneWriteOpResult = await collection.insertOne(obj);
                if (rs.ops) return <T>rs.ops[0];
            }
            else {
                let rs: InsertWriteOpResult = await collection.insertMany(obj);
                if (rs.ops) return <T[]>rs.ops;
            }
            return null;
        } finally {
            this.queue.release(db);
        }
    }

    async update<T extends object>(tableName: T | string, obj: T, opts?: {
        return?: boolean,
        multiple?: boolean
    }): Promise<number | T> {
        const tmp = <T>_.omit(obj, '_id');
        const _id = obj['_id'];
        let where: any = {};

        if (_id instanceof ObjectID) where._id = _id;
        else if (typeof _id == 'string') where._id = Mongo.uuid(_id);
        else where = _id;

        const db: Db = await this.queue.get();
        const collection: Collection = db.collection(tableName.toString());
        try {
            if (opts) {
                if (opts.return) {
                    let rs: FindAndModifyWriteOpResultObject = await collection.findOneAndUpdate(where, {
                        $set: tmp
                    });
                    return <T>_.merge(rs.value, obj);
                } else if (opts.multiple) {
                    let rs: UpdateWriteOpResult = await collection.updateMany(where, {
                        $set: tmp
                    });
                    return rs.result.n;
                }
            }
            let rs: UpdateWriteOpResult = await collection.updateOne(where, {
                $set: tmp
            });
            return rs.result.n;
        } finally {
            this.queue.release(db);
        }
    }

    async delete<T extends object>(tableName: T | string, filter: string | ObjectID | object, opts?: {
        return?: boolean,
        multiple?: boolean
    }): Promise<number | T> {
        const db: Db = await this.queue.get();
        const collection: Collection = db.collection(tableName.toString());
        let where: any = {};
        if (filter instanceof ObjectID) where._id = filter;
        else if (typeof filter == 'string') where._id = Mongo.uuid(filter);
        else where = filter;
        try {
            if (opts) {
                if (opts.return) {
                    let rs: FindAndModifyWriteOpResultObject = await collection.findOneAndDelete(where);
                    return <T>rs.value;
                } else if (opts.multiple) {
                    const rs: DeleteWriteOpResultObject = await collection.deleteMany(where);
                    return rs.result.n;
                }
            }
            const rs: DeleteWriteOpResultObject = await collection.deleteOne(where);
            return rs.result.n;
        } finally {
            this.queue.release(db);
        }
    }

    async manual<T extends object>(tableName: T | string, fcManual: (collection: Collection, db: Db) => any): Promise<any> {
        const db: Db = await this.queue.get();
        const collection: Collection = db.collection(tableName.toString());
        try {
            return await fcManual(collection, db);
        } finally {
            this.queue.release(db);
        }
    }

    async count<T extends object>(tableName: T | string, where): Promise<number> {
        const db: Db = await this.queue.get();
        const collection: Collection = db.collection(tableName.toString());
        try {
            return await collection.count(where);
        } finally {
            this.queue.release(db);
        }
    }

}