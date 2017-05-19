"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqplib_1 = require("amqplib");
const QueueHandler_1 = require("hinos-common/QueueHandler");
let map = {};
const defaultKey = Symbol('DefaultKey');
// @RabbitListener(): binded when received from backend
function RabbitListener({ des, key = defaultKey, command }, fc) {
    return (target, fieldName, func) => {
        const rabbitMQ = RabbitMQ.pool(key);
        if (!rabbitMQ)
            return console.warn(`  ⚠ Rabbit register "${key}" not found`);
        else
            console.info(`  √ ${des}`);
        rabbitMQ.pushHandler(command, fc);
    };
}
exports.RabbitListener = RabbitListener;
// @RABBITMQ: Pooler
function RABBITMQ(key = defaultKey) {
    return function (target, propertyKey) {
        Object.defineProperty(target, propertyKey, {
            get() {
                return RabbitMQ.pool(key);
            }
        });
    };
}
exports.RABBITMQ = RABBITMQ;
// RabbitMQ(): Config
function RabbitMQ({ key = defaultKey, url, releaseTimeout = 5000 }, binders) {
    console.info(`» RabbitMQ ${key.toString()} is used`);
    map[key] = new RabbitImpl(url, releaseTimeout, binders);
}
exports.RabbitMQ = RabbitMQ;
// RabbitMQ: Helper
(function (RabbitMQ) {
    function pool(key = defaultKey) {
        return map[key];
    }
    RabbitMQ.pool = pool;
    async function dispose() {
        for (let k in map) {
            await map[k].dispose();
        }
    }
    RabbitMQ.dispose = dispose;
})(RabbitMQ = exports.RabbitMQ || (exports.RabbitMQ = {}));
class RabbitImpl {
    constructor(url, releaseTimeout = 5000, binders) {
        this.queueReceiver = [];
        this.handlers = {};
        this.queueSender = new QueueHandler_1.QueueHandler(() => {
            return new Promise((resolve, reject) => {
                amqplib_1.connect(url).then(resolve).catch(reject);
            });
        }, (rabbit) => {
            return new Promise((resolve, reject) => {
                rabbit.close().then(resolve).catch(reject);
            });
        }, releaseTimeout);
        if (binders) {
            for (let b of binders) {
                this.bind({ queueName: b.name, des: b.des }, b.handler);
            }
        }
    }
    pushHandler(key, fc) {
        this.handlers[key] = fc;
    }
    get size() {
        return this.queueSender.size;
    }
    async dispose() {
        for (let q of this.queueReceiver) {
            await q.ch.close();
            await q.conn.close();
        }
    }
    async bind({ queueName, des = '' }, onConsume, durable = false, noAck = true) {
        console.info(`  √ ${des} [${queueName}]`);
        const conn = await this.queueSender.get();
        const ch = await conn.createChannel();
        const assetQueue = await ch.assertQueue(queueName, { durable });
        ch.consume(assetQueue.queue, async (msg) => {
            try {
                const data = JSON.parse(msg.content.toString());
                setTimeout(async () => {
                    console.log('Rabbit <==', `[${queueName}]`, data.Command);
                    await onConsume(data);
                }, 1000);
            }
            catch (error) {
                console.error(error);
            }
        }, {
            noAck
        });
        this.queueReceiver.push({
            conn, ch
        });
    }
    async send(queueName, data, durable = false) {
        const conn = await this.queueSender.get();
        const ch = await conn.createChannel();
        const assetQueue = await ch.assertQueue(queueName, { durable });
        ch.sendToQueue(assetQueue.queue, new Buffer(JSON.stringify(data)));
        console.log('==> Rabbit', `[${queueName}]`, data.Command);
        await this.queueSender.release(conn);
    }
}
