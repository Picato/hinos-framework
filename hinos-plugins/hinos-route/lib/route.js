"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const querystring = require("querystring");
const path = require("path");
const fs = require("fs");
let routes = {
    GET: new Array(),
    POST: new Array(),
    PUT: new Array(),
    DELETE: new Array(),
    PATCH: new Array(),
    HEAD: new Array(),
};
class RouteTemplate {
    constructor(method, path, cbs) {
        this.method = method;
        this.path = path;
        this.cbs = cbs;
        this.isParams = false;
        this.weight = 0;
        if (path.includes(':')) {
            const key = path.replace(/\//g, '\\/').replace(/:[A-Za-z0-9_]+/g, '([^\\/\\?]+)');
            const m = path.match(new RegExp(`${key}`));
            this.path = new RegExp(`^${key}(\\?(.+))?$`);
            this.isParams = true;
            this.paramsName = m.filter((e, i) => i > 0).map(e => e.substr(1));
        }
    }
    optimizeRoute() {
        const weight = this.weight;
        setTimeout(() => {
            let tmp = _.cloneDeep(routes[this.method]);
            tmp.sort((a, b) => a.weight - b.weight);
            routes[this.method] = tmp;
            RouteTemplate.nextOptimize += +(weight / RouteTemplate.stepOptimize) * RouteTemplate.stepOptimize;
        }, 0);
    }
    isValid(ctx) {
        const urlStr = ctx.req.url;
        if (!this.isParams) {
            ctx.params = {};
            const path = this.path;
            const urlStrs = urlStr.split('?');
            if (urlStrs[0] === path) {
                if (this.weight === RouteTemplate.nextOptimize)
                    this.optimizeRoute();
                this.weight++;
                if (urlStrs[1])
                    ctx.query = querystring.parse(urlStrs[1]);
                else
                    ctx.query = {};
                return true;
            }
            return false;
        }
        const path = this.path;
        const matchRoute = urlStr.match(path);
        if (!matchRoute) {
            ctx.params = {};
            return false;
        }
        const lenParams = this.paramsName.length;
        let tmp = {};
        for (let i0 = 0, len0 = lenParams; i0 < len0; i0++) {
            tmp[this.paramsName[i0]] = matchRoute[i0 + 1];
        }
        ctx.params = tmp;
        if (matchRoute[lenParams + 2])
            ctx.query = querystring.parse(matchRoute[lenParams + 2]);
        if (this.weight === RouteTemplate.nextOptimize)
            this.optimizeRoute();
        this.weight++;
        return true;
    }
    async executeMiddle(ctx) {
        let i = 0, cbs = this.cbs, len = cbs.length;
        let next = async (n = 1) => {
            i += n;
            if (i < len) {
                await cbs[i](ctx, next);
            }
        };
        await cbs[i](ctx, next);
    }
}
RouteTemplate.stepOptimize = 50;
RouteTemplate.nextOptimize = 50;
function route(controllerDir) {
    const files = fs.readdirSync(controllerDir);
    console.info(`» APIs register`);
    for (let f of files) {
        if (/\.js$/.test(f)) {
            console.info(`  --`);
            require(path.join(controllerDir, `/${f.substr(0, f.lastIndexOf('.'))}`));
        }
    }
    return async (ctx, next = () => { }) => {
        if (ctx.routed)
            return await next();
        // Server.Middleware to handle each request
        const mainRoute = routes[ctx.req.method];
        let route;
        for (let i = 0, len = mainRoute.length; i < len; i++) {
            route = mainRoute[i];
            if (route.isValid(ctx)) {
                // Passed request to controller                
                ctx.routed = true;
                await route.executeMiddle(ctx);
                break;
            }
        }
        return await next();
    };
}
exports.route = route;
(function (route) {
    function bindRoutes(method, path, ...cbs) {
        routes[method].push(new RouteTemplate(method, path, cbs));
    }
    route.bindRoutes = bindRoutes;
})(route = exports.route || (exports.route = {}));
function INJECT(cb) {
    return function (target, fieldName, func) {
        if (!func.value['mid'])
            func.value['mid'] = new Array();
        func.value['mid'].splice(0, 0, cb);
    };
}
exports.INJECT = INJECT;
function GET(pathStr) {
    return _api('GET', pathStr);
}
exports.GET = GET;
function POST(pathStr) {
    return _api('POST', pathStr);
}
exports.POST = POST;
function PUT(pathStr) {
    return _api('PUT', pathStr);
}
exports.PUT = PUT;
function DELETE(pathStr) {
    return _api('DELETE', pathStr);
}
exports.DELETE = DELETE;
function HEAD(pathStr) {
    return _api('HEAD', pathStr);
}
exports.HEAD = HEAD;
function PATCH(pathStr) {
    return _api('PATCH', pathStr);
}
exports.PATCH = PATCH;
function _api(method, pathStr) {
    return function (target, fieldName, func) {
        let mid = func.value['mid'] || new Array();
        mid.push(async (ctx, next) => {
            ctx.data = await func.value(ctx, next);
        });
        route.bindRoutes(method, pathStr, ...mid);
        console.info(`• ${method.toUpperCase()}\t ${pathStr}`);
    };
}
