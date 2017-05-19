/// <reference types="socket.io" />
export declare function SOCKETIO(key?: string): (target: any, propertyKey: string | symbol) => void;
export declare function Socketio({key, server}: {
    key?: string | symbol;
    server: any;
}, binders?: Socketio.SocketIOBinder[]): void;
export interface Socketio {
    on(path: any, eventName: any, fcListen: (socket: SocketIO.Socket, _this: Socketio) => void): Socketio;
    bind(path: string, handler?: {
        register?: Function;
    }): Socketio;
    send(path: string, sessionId: string, data: any, event?: string): void;
}
export declare namespace Socketio {
    interface SocketIOBinder {
        path: string;
        handler: {
            register?: (sessionId) => void;
        };
    }
    function pool(key?: string | symbol): Socketio;
}
