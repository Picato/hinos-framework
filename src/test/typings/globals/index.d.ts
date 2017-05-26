/// <reference path="../../../../typings/globals/index.d.ts" />
/// <reference path="./appconfig.d.ts" />
/// <reference path="./mocha.d.ts" />
/// <reference path="../../../../node_modules/hinos-common/Http.d.ts" />

// declare const AppConfig: IAppConfig;

declare namespace Http {
    interface Response {
        domain: object;
        headers: {
            [name: string]: any;
        };
        rawHeaders: object;
        url: string;
        method: string;
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
        error: any;
    }
    interface HttpOptions {
        query?: {
            [name: string]: any;
        };
        data?: any;
        headers?: {
            [name: string]: any;
        };
        field?: {
            [name: string]: any;
        };
        attach?: {
            [name: string]: string | object;
        };
        type?: string;
    }
}
declare class Http {
    static headers: any;
    static head(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static delete(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static get(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static post(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static put(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static patch(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
}
