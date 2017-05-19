export declare function RabbitListener({des, key, command}: {
    des: any;
    key?: string | symbol;
    command: any;
}, fc: (err: any, data: any) => void): Function;
export declare function RABBITMQ(key?: string | symbol): (target: any, propertyKey: string | symbol) => void;
export declare function RabbitMQ({key, url, releaseTimeout}: {
    key?: string | symbol;
    url: any;
    releaseTimeout?: number;
}, binders?: RabbitMQ.RabbitQueueBinder[]): void;
export interface RabbitMQ {
    size: number;
    pushHandler(key: string, fc: Function): void;
    dispose(): Promise<void>;
    bind(queue: {
        queueName: string;
        des?: string;
    }, onConsume: (data: any) => Promise<void> | void, durable?: boolean, noAck?: boolean): Promise<void>;
    send(queueName: string, data: any, durable?: boolean): Promise<void>;
}
export declare namespace RabbitMQ {
    interface RabbitQueueBinder {
        des?: string;
        name: string;
        handler: (data) => void;
    }
    function pool(key?: string | symbol): RabbitMQ;
    function dispose(): Promise<void>;
}
