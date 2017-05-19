"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const mimeTypes = require("mime-types");
class RouteStatic {
    constructor(virtualPath, realPath) {
        this.virtualPath = virtualPath;
        this.realPath = realPath;
        this.replaceRegex = new RegExp(`^${this.virtualPath}`);
    }
    getData(urlStr) {
        const filePath = path.resolve(urlStr.replace(this.replaceRegex, this.realPath));
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stat) => {
                if (err)
                    return reject(err);
                resolve({ size: stat.size, stream: fs.createReadStream(filePath) });
            });
        });
    }
}
let routeMap = new Set();
function serve(routes) {
    if (routes) {
        for (let k in routes) {
            routeMap.add(new RouteStatic(k, routes[k]));
        }
    }
    return async (ctx, next = () => { }) => {
        if (ctx.routed)
            return await next();
        const method = ctx.req.method;
        if (method !== 'GET')
            return await next();
        const urlStr = ctx.req.url;
        for (let route of routeMap) {
            if (urlStr.indexOf(route.virtualPath) !== 0)
                continue;
            const contentType = mimeTypes.contentType(path.basename(urlStr));
            if (!contentType)
                return await next();
            const { stream, size } = await route.getData(urlStr);
            ctx.contentType = contentType;
            ctx.set({ 'Content-Length': size.toString() });
            ctx.data = stream;
            ctx.routed = true;
            return await next();
        }
        return await next();
    };
}
exports.serve = serve;
