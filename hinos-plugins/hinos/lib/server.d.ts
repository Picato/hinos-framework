/// <reference types="node" />
import * as http from 'http';
import { Context } from './context';
export declare namespace Server {
    interface Middleware {
        (ctx: Context, next?: (n) => void): Promise<void> | void;
    }
}
export declare class Server {
    static server: http.Server;
    private static midware;
    private static onError;
    static use(midware: Server.Middleware): void;
    static onerror(cb: (e: any, ctx: Context) => void): void;
    static listen(port: number, cb?: Function): void;
    static readonly env: any;
}
