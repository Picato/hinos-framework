export declare class QueueHandler<T extends {
    autoclose?: Function;
    tm?: any;
}> {
    private fcGetObject;
    private fcReleaseObject;
    private timeout;
    queues: Array<T>;
    constructor(fcGetObject: () => T | Promise<T>, fcReleaseObject: (item: T) => any | Promise<any>, timeout?: number);
    readonly size: number;
    release(item: T): void;
    get(): Promise<T>;
}
