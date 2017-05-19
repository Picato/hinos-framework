import { createClient, RedisClient } from 'redis';
import { QueueHandler } from 'hinos-common/QueueHandler';

let map: { [propName: string]: Redis } = {};
const defaultKey = Symbol('DefaultKey');

// Redis(): Config
export function Redis({ key = <string | symbol>defaultKey, host, port = 6379, db = '', releaseTimeout = 5000 }) {
    console.info(`» Redis ${key.toString()} is used`);
    map[key] = new RedisImpl({
        host, port, db
    }, releaseTimeout);
}

export interface Redis {
    size: number;
    clear(): Promise<void>;
    get(key: string | any): Promise<any>;
    set(key: string | any, value: any, lifetime?: number): Promise<any>;
    del(key: string | any): Promise<void>;
    touch(key: string | any, lifetime?: number): Promise<void>;
}

// Redis: Helper
export namespace Redis {
    export function pool(key = <string | symbol>defaultKey): Redis {
        return map[key];
    }
}

// @REDIS: Pooler
export function REDIS(key?: string) {
    return function (target: any, propertyKey: string | symbol) {
        Object.defineProperty(target, propertyKey, {
            get() {
                return Redis.pool(key);
            }
        })
    }
}

class RedisImpl implements Redis {
    private queue: QueueHandler<RedisClient>;

    constructor(opts = {}, releaseTimeout = 5000) {
        this.queue = new QueueHandler<RedisClient>(() => createClient(opts), (redis: RedisClient) => redis.quit(), releaseTimeout);
    }

    public get size() {
        return this.queue.size;
    }

    public clear(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const redis = await this.queue.get();
            redis.flushdb((err) => {
                this.queue.release(redis);
                if (err) return reject(err);
                resolve();
            });
        });
    }
    public get(key: string): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const redis = await this.queue.get();
            redis.get(key.toString(), (err, data) => {
                this.queue.release(redis);
                if (err) return reject(err);
                resolve(data ? JSON.parse(data) : null);
            })
        });
    }
    public set(key: string, value: any, lifetime = 0): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            const redis = await this.queue.get();
            redis.set(key.toString(), JSON.stringify(value), async (err) => {
                this.queue.release(redis);
                if (err) return reject(err);
                this.touch(key.toString(), lifetime).then(() => {
                    resolve(value);
                }).catch(reject);
            });
        });
    }
    public del(key: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const redis = await this.queue.get();
            redis.del(key.toString(), async (err) => {
                this.queue.release(redis);
                if (err) return reject(err);
                resolve()
            })
        });
    }
    public touch(key: string, lifetime = 300): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            lifetime = +lifetime;
            if (lifetime <= 0) return resolve();
            const redis = await this.queue.get();
            if (lifetime > 1800) {
                redis.expireat(key.toString(), Math.round(+new Date() / 1000) + lifetime, async (err) => {
                    this.queue.release(redis);
                    if (err) return reject(err);
                    resolve();
                });
            } else {
                redis.expire(key.toString(), lifetime, async (err) => {
                    this.queue.release(redis);
                    if (err) return reject(err);
                    resolve();
                });
            }
        });
    }
}