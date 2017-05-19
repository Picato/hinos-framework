import { Server } from 'hinos';
export interface RouteOptions {
    encoding?: string;
    controllerDir?: string;
}
export declare function route(controllerDir: string): Server.Middleware;
export declare namespace route {
    function bindRoutes(method: string, path: string, ...cbs: Server.Middleware[]): void;
}
export declare function INJECT(cb: Server.Middleware): Function;
export declare function GET(pathStr: string): Function;
export declare function POST(pathStr: string): Function;
export declare function PUT(pathStr: string): Function;
export declare function DELETE(pathStr: string): Function;
export declare function HEAD(pathStr: string): Function;
export declare function PATCH(pathStr: string): Function;
