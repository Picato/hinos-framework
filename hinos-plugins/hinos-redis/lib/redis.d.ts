export declare function Redis({key, host, port, db, releaseTimeout}: {
    key?: string | symbol;
    host: any;
    port?: number;
    db?: string;
    releaseTimeout?: number;
}): void;
export interface Redis {
    size: number;
    clear(): Promise<void>;
    get(key: string | any): Promise<any>;
    set(key: string | any, value: any, lifetime?: number): Promise<any>;
    del(key: string | any): Promise<void>;
    touch(key: string | any, lifetime?: number): Promise<void>;
}
export declare namespace Redis {
    function pool(key?: string | symbol): Redis;
}
export declare function REDIS(key?: string): (target: any, propertyKey: string | symbol) => void;
