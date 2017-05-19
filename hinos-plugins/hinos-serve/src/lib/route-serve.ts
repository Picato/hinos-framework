import { Server, Context } from 'hinos';
import * as path from 'path';
import * as fs from 'fs';
import * as mimeTypes from 'mime-types';

class RouteStatic {
    replaceRegex: RegExp;

    constructor(public virtualPath: string, private realPath: string) {
        this.replaceRegex = new RegExp(`^${this.virtualPath}`);
    }

    getData(urlStr): Promise<{ size: number, stream: any }> {
        const filePath = path.resolve(urlStr.replace(this.replaceRegex, this.realPath));
        return new Promise<{ size: number, stream: any }>((resolve, reject) => {
            fs.stat(filePath, (err, stat: fs.Stats) => {
                if (err) return reject(err);
                resolve({ size: stat.size, stream: fs.createReadStream(filePath) });
            })
        });
    }
}

let routeMap = new Set<RouteStatic>();

export function serve(routes: any): Server.Middleware {
    if (routes) {
        for (let k in routes) {
            routeMap.add(new RouteStatic(k, routes[k]));
        }
    }
    return async (ctx: Context, next: Function = () => { }) => {
        if (ctx.routed) return await next();
        const method = ctx.req.method;
        if (method !== 'GET') return await next();
        const urlStr: string = ctx.req.url;
        for (let route of routeMap) {
            if (urlStr.indexOf(route.virtualPath) !== 0) continue;
            const contentType = mimeTypes.contentType(path.basename(urlStr));
            if (!contentType) return await next();
            const { stream, size } = await route.getData(urlStr);
            ctx.contentType = contentType;
            ctx.set({ 'Content-Length': size.toString() });
            ctx.data = stream;
            ctx.routed = true;
            return await next();
        }
        return await next();
    }
}