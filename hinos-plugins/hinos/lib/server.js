"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const context_1 = require("./context");
class Server {
    static use(midware) {
        Server.midware.push(midware);
    }
    static onerror(cb) {
        Server.onError = cb;
    }
    static listen(port, cb) {
        Server.server.listen(port, cb);
    }
    static get env() {
        return process.env.NODE_ENV || 'development';
    }
}
Server.server = http.createServer(async (req, res) => {
    let ctx = new context_1.Context(req, res);
    try {
        let i = 0, midware = Server.midware, len = midware.length;
        let next = async (n = 1) => {
            i += n;
            if (i < len) {
                await midware[i](ctx, next);
            }
        };
        await midware[i](ctx, next);
        ctx.response();
    }
    catch (err) {
        Server.onError(err, ctx);
    }
});
Server.midware = new Array();
Server.onError = (err, { res = null }) => {
    if (typeof err !== 'string') {
        res.statusCode = err.status || 500;
        return res.end(err.message);
    }
    res.statusCode = 500;
    res.end(err);
};
exports.Server = Server;
