import { connect, Connection, Channel, Replies } from 'amqplib';
import { QueueHandler } from 'hinos-common/QueueHandler';

let map: { [propName: string]: RabbitMQ } = {};
const defaultKey = Symbol('DefaultKey');

// @RabbitListener(): binded when received from backend
export function RabbitListener({ des, key = <string | symbol>defaultKey, command }, fc: (err: any, data: any) => void): Function {
    return (target: Object, fieldName: String, func: TypedPropertyDescriptor<Function>) => {
        const rabbitMQ = RabbitMQ.pool(key);
        if (!rabbitMQ) return console.warn(`  ⚠ Rabbit register "${key}" not found`);
        else console.info(`  √ ${des}`);
        rabbitMQ.pushHandler(command, fc);
    };
}

// @RABBITMQ: Pooler
export function RABBITMQ(key = <string | symbol>defaultKey) {
    return function (target: any, propertyKey: string | symbol) {
        Object.defineProperty(target, propertyKey, {
            get() {
                return RabbitMQ.pool(key);
            }
        })
    }
}
// RabbitMQ(): Config
export function RabbitMQ({ key = <string | symbol>defaultKey, url, releaseTimeout = 5000 }, binders?: RabbitMQ.RabbitQueueBinder[]) {
    console.info(`» RabbitMQ ${key.toString()} is used`);
    map[key] = new RabbitImpl(url, releaseTimeout, binders);
}
export interface RabbitMQ {
    size: number;
    pushHandler(key: string, fc: Function): void;
    dispose(): Promise<void>;
    bind(queue: { queueName: string; des?: string }, onConsume: (data: any) => Promise<void> | void, durable?: boolean, noAck?: boolean): Promise<void>;
    send(queueName: string, data: any, durable?: boolean): Promise<void>;
}
// RabbitMQ: Helper
export namespace RabbitMQ {
    export interface RabbitQueueBinder {
        des?: string;
        name: string;
        handler: (data) => void;
    }
    export function pool(key = <string | symbol>defaultKey): RabbitMQ {
        return map[key];
    }
    export async function dispose(): Promise<void> {
        for (let k in map) {
            await map[k].dispose();
        }
    }
}

class RabbitImpl implements RabbitMQ {
    private queueSender: QueueHandler<Connection>;
    private queueReceiver: { conn: Connection, ch: Channel }[] = [];
    private handlers: any = {};

    constructor(url, releaseTimeout = 5000, binders?: RabbitMQ.RabbitQueueBinder[]) {
        this.queueSender = new QueueHandler<Connection>(() => {
            return new Promise((resolve: any, reject: any) => {
                connect(url).then(resolve).catch(reject);
            });
        }, (rabbit: Connection) => {
            return new Promise((resolve: any, reject: any) => {
                rabbit.close().then(resolve).catch(reject);
            });
        }, releaseTimeout);
        if (binders) {
            for (let b of binders) {
                this.bind({ queueName: b.name, des: b.des }, b.handler);
            }
        }
    }

    public pushHandler(key: string, fc: Function) {
        this.handlers[key] = fc;
    }

    public get size() {
        return this.queueSender.size;
    }

    public async dispose() {
        for (let q of this.queueReceiver) {
            await q.ch.close();
            await q.conn.close();
        }
    }

    public async bind({ queueName, des = '' }, onConsume: (data: any) => Promise<void> | void, durable = false, noAck = true) {
        console.info(`  √ ${des} [${queueName}]`);
        const conn: Connection = await this.queueSender.get();
        const ch: Channel = await conn.createChannel();
        const assetQueue: Replies.AssertQueue = await ch.assertQueue(queueName, { durable });
        ch.consume(assetQueue.queue, async (msg) => {
            try {
                const data = JSON.parse(msg.content.toString());
                setTimeout(async () => {
                    console.log('Rabbit <==', `[${queueName}]`, data.Command);
                    await onConsume(data);
                }, 1000);
            } catch (error) {
                console.error(error);
            }
        }, {
                noAck
            });
        this.queueReceiver.push({
            conn, ch
        })
    }
    public async send(queueName: string, data: any, durable = false) {
        const conn: Connection = await this.queueSender.get();
        const ch: Channel = await conn.createChannel();
        const assetQueue: Replies.AssertQueue = await ch.assertQueue(queueName, { durable });
        ch.sendToQueue(assetQueue.queue, new Buffer(JSON.stringify(data)));
        console.log('==> Rabbit', `[${queueName}]`, data.Command);
        await this.queueSender.release(conn);
    }

}