import * as http from 'http';
import { Context, Request, Response } from './context';

export namespace Server {
    export interface Middleware {
        (ctx: Context, next?: (n) => void): Promise<void> | void;
    }
}

export class Server {
    static server: http.Server = http.createServer(async (req: Request, res: Response) => {
        let ctx = new Context(req, res);
        try {
            let i = 0, midware = Server.midware, len = midware.length;
            let next = async (n = 1) => {
                i += n;
                if (i < len) {
                    await midware[i](ctx, next);
                }
            }
            await midware[i](ctx, next);
            ctx.response();
        } catch (err) {
            Server.onError(err, ctx);
        }
    });
    private static midware = new Array<Server.Middleware>();
    private static onError = (err, { res = <Response>null }) => {
        if (typeof err !== 'string') {
            res.statusCode = err.status || 500;
            return res.end(err.message);
        }
        res.statusCode = 500;
        res.end(err);
    }

    static use(midware: Server.Middleware) {
        Server.midware.push(midware);
    }
    static onerror(cb: (e: any, ctx: Context) => void) {
        Server.onError = cb;
    }
    static listen(port: number, cb?: Function) {
        Server.server.listen(port, cb);
    }
    static get env() {
        return process.env.NODE_ENV || 'development';
    }
}