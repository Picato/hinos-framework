"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const QueueHandler_1 = require("hinos-common/QueueHandler");
let map = {};
const defaultKey = Symbol('DefaultKey');
// Redis(): Config
function Redis({ key = defaultKey, host, port = 6379, db = '', releaseTimeout = 5000 }) {
    console.info(`» Redis ${key.toString()} is used`);
    map[key] = new RedisImpl({
        host, port, db
    }, releaseTimeout);
}
exports.Redis = Redis;
// Redis: Helper
(function (Redis) {
    function pool(key = defaultKey) {
        return map[key];
    }
    Redis.pool = pool;
})(Redis = exports.Redis || (exports.Redis = {}));
// @REDIS: Pooler
function REDIS(key) {
    return function (target, propertyKey) {
        Object.defineProperty(target, propertyKey, {
            get() {
                return Redis.pool(key);
            }
        });
    };
}
exports.REDIS = REDIS;
class RedisImpl {
    constructor(opts = {}, releaseTimeout = 5000) {
        this.queue = new QueueHandler_1.QueueHandler(() => redis_1.createClient(opts), (redis) => redis.quit(), releaseTimeout);
    }
    get size() {
        return this.queue.size;
    }
    clear() {
        return new Promise(async (resolve, reject) => {
            const redis = await this.queue.get();
            redis.flushdb((err) => {
                this.queue.release(redis);
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
    get(key) {
        return new Promise(async (resolve, reject) => {
            const redis = await this.queue.get();
            redis.get(key.toString(), (err, data) => {
                this.queue.release(redis);
                if (err)
                    return reject(err);
                resolve(data ? JSON.parse(data) : null);
            });
        });
    }
    set(key, value, lifetime = 0) {
        return new Promise(async (resolve, reject) => {
            const redis = await this.queue.get();
            redis.set(key.toString(), JSON.stringify(value), async (err) => {
                this.queue.release(redis);
                if (err)
                    return reject(err);
                this.touch(key.toString(), lifetime).then(() => {
                    resolve(value);
                }).catch(reject);
            });
        });
    }
    del(key) {
        return new Promise(async (resolve, reject) => {
            const redis = await this.queue.get();
            redis.del(key.toString(), async (err) => {
                this.queue.release(redis);
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
    touch(key, lifetime = 300) {
        return new Promise(async (resolve, reject) => {
            lifetime = +lifetime;
            if (lifetime <= 0)
                return resolve();
            const redis = await this.queue.get();
            if (lifetime > 1800) {
                redis.expireat(key.toString(), Math.round(+new Date() / 1000) + lifetime, async (err) => {
                    this.queue.release(redis);
                    if (err)
                        return reject(err);
                    resolve();
                });
            }
            else {
                redis.expire(key.toString(), lifetime, async (err) => {
                    this.queue.release(redis);
                    if (err)
                        return reject(err);
                    resolve();
                });
            }
        });
    }
}
