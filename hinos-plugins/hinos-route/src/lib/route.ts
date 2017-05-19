import { Context, Server } from 'hinos';
import * as _ from 'lodash';
import * as querystring from 'querystring';
import * as path from 'path';
import * as fs from 'fs';

let routes: { [propName: string]: Array<RouteTemplate> } = {
    GET: new Array<RouteTemplate>(),
    POST: new Array<RouteTemplate>(),
    PUT: new Array<RouteTemplate>(),
    DELETE: new Array<RouteTemplate>(),
    PATCH: new Array<RouteTemplate>(),
    HEAD: new Array<RouteTemplate>(),
};

export interface RouteOptions {
    encoding?: string;
    controllerDir?: string;
}

class RouteTemplate {
    private isParams: boolean = false;
    private paramsName: string[];
    private weight = 0;
    private static stepOptimize = 50;
    private static nextOptimize = 50;

    constructor(private method: string, private path: string | RegExp, private cbs: Function[]) {
        if ((<string>path).includes(':')) {
            const key = (<string>path).replace(/\//g, '\\/').replace(/:[A-Za-z0-9_]+/g, '([^\\/\\?]+)');
            const m = (<string>path).match(new RegExp(`${key}`));
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

    isValid(ctx: Context) {
        const urlStr = ctx.req.url;
        if (!this.isParams) {
            ctx.params = {};
            const path = <string>this.path;
            const urlStrs = urlStr.split('?');
            if (urlStrs[0] === path) {
                if (this.weight === RouteTemplate.nextOptimize) this.optimizeRoute();
                this.weight++;
                if (urlStrs[1]) ctx.query = querystring.parse(urlStrs[1]);
                else ctx.query = {};
                return true;
            }
            return false;
        }
        const path = <RegExp>this.path;
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
        if (matchRoute[lenParams + 2]) ctx.query = querystring.parse(matchRoute[lenParams + 2]);
        if (this.weight === RouteTemplate.nextOptimize) this.optimizeRoute();
        this.weight++;
        return true;
    }

    async executeMiddle(ctx: Context) {
        let i = 0, cbs = this.cbs, len = cbs.length;
        let next = async (n = 1) => {
            i += n;
            if (i < len) {
                await cbs[i](ctx, next);
            }
        }
        await cbs[i](ctx, next);
    }
}

export function route(controllerDir: string): Server.Middleware {
    const files = fs.readdirSync(controllerDir);
    console.info(`» APIs register`);
    for (let f of files) {
        if (/\.js$/.test(f)) {
            console.info(`  --`);
            require(path.join(controllerDir, `/${f.substr(0, f.lastIndexOf('.'))}`));
        }
    }
    return async (ctx: Context, next: Function = () => { }) => {
        if (ctx.routed) return await next();
        // Server.Middleware to handle each request
        const mainRoute = <RouteTemplate[]>routes[ctx.req.method];
        let route: RouteTemplate;
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
    }
}

export namespace route {
    export function bindRoutes(method: string, path: string, ...cbs: Server.Middleware[]) {
        routes[method].push(new RouteTemplate(method, path, cbs));
    }
}
export function INJECT(cb: Server.Middleware): Function {
    return function (target: Function, fieldName: String, func: TypedPropertyDescriptor<Function>) {
        if (!func.value['mid']) func.value['mid'] = new Array<Server.Middleware>();
        func.value['mid'].splice(0, 0, cb);
    };
}
export function GET(pathStr: string): Function {
    return _api('GET', pathStr);
}
export function POST(pathStr: string): Function {
    return _api('POST', pathStr);
}
export function PUT(pathStr: string): Function {
    return _api('PUT', pathStr);
}
export function DELETE(pathStr: string): Function {
    return _api('DELETE', pathStr);
}
export function HEAD(pathStr: string): Function {
    return _api('HEAD', pathStr);
}
export function PATCH(pathStr: string): Function {
    return _api('PATCH', pathStr);
}

function _api(method: string, pathStr: string) {
    return function (target: Function, fieldName: String, func: TypedPropertyDescriptor<Function>) {
        let mid = <Server.Middleware[]>func.value['mid'] || new Array<Server.Middleware>();
        mid.push(async (ctx: Context, next: Function) => {
            ctx.data = await func.value(ctx, next);
        });
        route.bindRoutes(method, pathStr, ...mid);
        console.info(`• ${method.toUpperCase()}\t ${pathStr}`);
    };
}