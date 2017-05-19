import * as http from 'http';
export interface Request extends http.IncomingMessage {
}
export interface Response extends http.ServerResponse {
}
export declare class Context {
    req: Request;
    res: Response;
    routed: boolean;
    params: any;
    query: any;
    body: any;
    readonly headers: any;
    private _headers;
    private status;
    data: any;
    state: any;
    message: string;
    contentType: string;
    constructor(req: Request, res: Response);
    redirect(url: string): void;
    is(type0: string, type1?: string, type2?: string): boolean;
    set(headers: {
        [propName: string]: string | string[];
    }): void;
    get(key: string): string;
    response(): void | Response;
}
