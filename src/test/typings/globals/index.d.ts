/// <reference path="./appconfig.d.ts" />
/// <reference path="./mocha.d.ts" />

interface Response {
    domain: object;
    headers: object;
    rawHeaders: object;
    url: string;
    method: object;
    statusCode: number;
    statusMessage: string;
    client: object;
    req: object;
    request: object;
    body: any;
    code: number;
    status: number;
    statusType: number;
    info: boolean;
    ok: boolean;
    cookies: object;
    raw_body: string;
}
interface HttpOptions {
    query?: {};
    data?: any;
    headers?: {};
    attach?: {};
    field?: {};
    type?: string;
}
declare class Http {
    static head(url: string, opts?: HttpOptions): Promise<Response>;
    static delete(url: string, opts?: HttpOptions): Promise<Response>;
    static get(url: string, opts?: HttpOptions): Promise<Response>;
    static post(url: string, opts?: HttpOptions): Promise<Response>;
    static put(url: string, opts?: HttpOptions): Promise<Response>;
    static patch(url: string, opts?: HttpOptions): Promise<Response>;
}