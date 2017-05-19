"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*** npm install socket.io */
const socketio = require("socket.io");
let map = {};
const defaultKey = Symbol('DefaultKey');
// @SOCKETIO: pooler
function SOCKETIO(key) {
    return function (target, propertyKey) {
        Object.defineProperty(target, propertyKey, {
            get() {
                return Socketio.pool(key);
            }
        });
    };
}
exports.SOCKETIO = SOCKETIO;
// SocketIO(): Config
function Socketio({ key = defaultKey, server }, binders) {
    console.info(`» SocketIO ${key.toString()} is used`);
    map[key] = new SocketIOImpl(server);
    if (binders) {
        for (let { path, handler } of binders) {
            map[key].bind(path, handler);
        }
    }
}
exports.Socketio = Socketio;
// SocketIO: Helper
(function (Socketio) {
    function pool(key = defaultKey) {
        return map[key];
    }
    Socketio.pool = pool;
})(Socketio = exports.Socketio || (exports.Socketio = {}));
class SocketIOImpl {
    constructor(server) {
        this.ioers = {};
        this.io = socketio(server);
    }
    on(path, eventName, fcListen) {
        console.info(`  √ Path [${path}] is on`);
        let ioers = this.ioers;
        ioers[path] = {};
        this.io
            .of(path)
            .on(eventName, (socket) => {
            fcListen(socket, this);
        });
        return this;
    }
    bind(path, handler = {}) {
        console.info(`  √ Path [${path}] is bound`);
        let ioers = this.ioers;
        ioers[path] = {};
        this.io
            .of(path)
            .on('connection', (socket) => {
            socket.emit('connected');
            socket.on('register', function (sessionId) {
                ioers[path][sessionId] = socket;
                if (handler.register)
                    handler.register(sessionId);
            });
            socket.on('disconnect', function () {
                for (let i in ioers[path]) {
                    if (ioers[path][i] === socket)
                        delete ioers[path][i];
                }
            });
        });
        return this;
    }
    send(path, sessionId, data, event) {
        try {
            const socket = this.ioers[path][sessionId];
            if (socket) {
                if (socket.connected) {
                    socket.emit(event || sessionId.toString(), JSON.stringify(data));
                }
                else {
                    delete this.ioers[path][sessionId];
                }
            }
        }
        catch (e) {
            console.warn('SocketIO not sent: ' + sessionId);
        }
    }
}
