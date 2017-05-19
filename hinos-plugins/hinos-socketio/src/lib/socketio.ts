/*** npm install socket.io */
import * as socketio from 'socket.io';
import * as http from 'http';

let map: { [propName: string]: Socketio } = {}
const defaultKey = Symbol('DefaultKey');

// @SOCKETIO: pooler
export function SOCKETIO(key?: string) {
    return function (target: any, propertyKey: string | symbol) {
        Object.defineProperty(target, propertyKey, {
            get() {
                return Socketio.pool(key);
            }
        })
    }
}
// SocketIO(): Config
export function Socketio({ key = <string | symbol>defaultKey, server }, binders?: Socketio.SocketIOBinder[]) {
    console.info(`» SocketIO ${key.toString()} is used`);
    map[key] = new SocketIOImpl(server);
    if (binders) {
        for (let { path, handler } of binders) {
            map[key].bind(path, handler);
        }
    }
}
export interface Socketio {
    on(path, eventName, fcListen: (socket: SocketIO.Socket, _this: Socketio) => void): Socketio;
    bind(path: string, handler?: { register?: Function }): Socketio;
    send(path: string, sessionId: string, data: any, event?: string): void;
}
// SocketIO: Helper
export namespace Socketio {
    export interface SocketIOBinder {
        path: string;
        handler: {
            register?: (sessionId) => void;
        }
    }
    export function pool(key = <string | symbol>defaultKey): Socketio {
        return map[key];
    }
}

class SocketIOImpl implements Socketio {
    private io: SocketIO.Server;
    private ioers: {
        string?: {
            string?: SocketIO.Socket
        }
    } = {};

    constructor(server: http.Server) {
        this.io = socketio(server);
    }

    public on(path, eventName, fcListen: (socket: SocketIO.Socket, _this: Socketio) => void) {
        console.info(`  √ Path [${path}] is on`);
        let ioers = this.ioers;
        ioers[path] = {};
        this.io
            .of(path)
            .on(eventName, (socket: SocketIO.Socket) => {
                fcListen(socket, this);
            });
        return this;
    }

    public bind(path: string, handler: { register?: Function } = {}) {
        console.info(`  √ Path [${path}] is bound`);
        let ioers = this.ioers;
        ioers[path] = {};
        this.io
            .of(path)
            .on('connection', (socket: SocketIO.Socket) => {
                socket.emit('connected');
                socket.on('register', function (sessionId) {
                    ioers[path][sessionId] = socket;
                    if (handler.register) handler.register(sessionId);
                });
                socket.on('disconnect', function () {
                    for (let i in ioers[path]) {
                        if (ioers[path][i] === socket) delete ioers[path][i];
                    }
                });
            });
        return this;
    }
    public send(path: string, sessionId: string, data: any, event?: string) {
        try {
            const socket: SocketIO.Socket = this.ioers[path][sessionId];
            if (socket) {
                if (socket.connected) {
                    socket.emit(event || sessionId.toString(), JSON.stringify(data));
                } else {
                    delete this.ioers[path][sessionId];
                }
            }
        } catch (e) {
            console.warn('SocketIO not sent: ' + sessionId);
        }
    }
}
