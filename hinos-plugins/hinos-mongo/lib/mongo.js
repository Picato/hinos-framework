"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const _ = require("lodash");
const QueueHandler_1 = require("hinos-common/QueueHandler");
let map = {};
const defaultKey = Symbol('DefaultKey');
class Uuid extends mongodb_1.ObjectID {
}
exports.Uuid = Uuid;
// @Collection: Declare table
function Collection(name) {
    return (constructor) => {
        Object.defineProperty(constructor, 'toString', {
            value: () => name || constructor.name
        });
    };
}
exports.Collection = Collection;
// @MONGO: pooler
function MONGO(key) {
    return function (target, propertyKey) {
        Object.defineProperty(target, propertyKey, {
            get() {
                return Mongo.pool(key);
            }
        });
    };
}
exports.MONGO = MONGO;
// Mongo(): Config
function Mongo({ url, key = defaultKey, releaseTimeout = 5000 }) {
    console.info(`» Mongo ${key.toString()} is used`);
    map[key] = new MongoImpl(url, releaseTimeout);
}
exports.Mongo = Mongo;
// Mongo: Helper
(function (Mongo) {
    function pool(key = defaultKey) {
        return map[key];
    }
    Mongo.pool = pool;
    function uuid(id) {
        if (!id)
            return new Uuid();
        if (id instanceof Array) {
            for (let i in id) {
                id[i] = Mongo.uuid(id[i]);
            }
            return id;
        }
        return typeof id === 'string' ? new mongodb_1.ObjectID(id) : id;
    }
    Mongo.uuid = uuid;
})(Mongo = exports.Mongo || (exports.Mongo = {}));
class MongoImpl {
    constructor(url, releaseTimeout = 5000) {
        this.queue = new QueueHandler_1.QueueHandler(() => mongodb_1.MongoClient.connect(url), db => db.close(), releaseTimeout);
    }
    get size() {
        return this.queue.size;
    }
    async find(tableName, { $where = {}, $fields = {}, $sort = {}, $page = 1, $recordsPerPage = 20 }) {
        const db = await this.queue.get();
        const collection = db.collection(tableName.toString());
        try {
            let query = collection.find($where, $fields);
            query = query.sort($sort);
            if ($page > 0)
                query = query.skip(($page - 1) * $recordsPerPage);
            if ($recordsPerPage > 0)
                query = query.limit($recordsPerPage);
            return await query.toArray();
        }
        finally {
            this.queue.release(db);
        }
    }
    async get(tableName, filter, fields) {
        const db = await this.queue.get();
        const collection = db.collection(tableName.toString());
        let fil = {
            $where: {},
            $fields: {}
        };
        if (filter instanceof mongodb_1.ObjectID)
            fil.$where._id = filter;
        else if (typeof filter == 'string')
            fil.$where._id = Mongo.uuid(filter);
        else
            fil.$where = filter;
        if (fields)
            fil.$fields = fields;
        try {
            return await collection.findOne(fil.$where, fil.$fields);
        }
        finally {
            this.queue.release(db);
        }
    }
    async insert(tableName, obj) {
        const db = await this.queue.get();
        const collection = db.collection(tableName.toString());
        try {
            if (!(obj instanceof Array)) {
                let rs = await collection.insertOne(obj);
                if (rs.ops)
                    return rs.ops[0];
            }
            else {
                let rs = await collection.insertMany(obj);
                if (rs.ops)
                    return rs.ops;
            }
            return null;
        }
        finally {
            this.queue.release(db);
        }
    }
    async update(tableName, obj, opts) {
        const tmp = _.omit(obj, '_id');
        const _id = obj['_id'];
        let where = {};
        if (_id instanceof mongodb_1.ObjectID)
            where._id = _id;
        else if (typeof _id == 'string')
            where._id = Mongo.uuid(_id);
        else
            where = _id;
        const db = await this.queue.get();
        const collection = db.collection(tableName.toString());
        try {
            if (opts) {
                if (opts.return) {
                    let rs = await collection.findOneAndUpdate(where, {
                        $set: tmp
                    });
                    return _.merge(rs.value, obj);
                }
                else if (opts.multiple) {
                    let rs = await collection.updateMany(where, {
                        $set: tmp
                    });
                    return rs.result.n;
                }
            }
            let rs = await collection.updateOne(where, {
                $set: tmp
            });
            return rs.result.n;
        }
        finally {
            this.queue.release(db);
        }
    }
    async delete(tableName, filter, opts) {
        const db = await this.queue.get();
        const collection = db.collection(tableName.toString());
        let where = {};
        if (filter instanceof mongodb_1.ObjectID)
            where._id = filter;
        else if (typeof filter == 'string')
            where._id = Mongo.uuid(filter);
        else
            where = filter;
        try {
            if (opts) {
                if (opts.return) {
                    let rs = await collection.findOneAndDelete(where);
                    return rs.value;
                }
                else if (opts.multiple) {
                    const rs = await collection.deleteMany(where);
                    return rs.result.n;
                }
            }
            const rs = await collection.deleteOne(where);
            return rs.result.n;
        }
        finally {
            this.queue.release(db);
        }
    }
    async manual(tableName, fcManual) {
        const db = await this.queue.get();
        const collection = db.collection(tableName.toString());
        try {
            return await fcManual(collection, db);
        }
        finally {
            this.queue.release(db);
        }
    }
    async count(tableName, where) {
        const db = await this.queue.get();
        const collection = db.collection(tableName.toString());
        try {
            return await collection.count(where);
        }
        finally {
            this.queue.release(db);
        }
    }
}
