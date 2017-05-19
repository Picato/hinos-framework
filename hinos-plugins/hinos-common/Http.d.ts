export declare namespace Http {
    interface Response {
        domain: object;
        headers: any;
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
        error: any;
    }
    interface HttpOptions {
        query?: {};
        data?: any;
        headers?: {};
        attach?: {};
        field?: {};
        type?: string;
    }
}
export declare class Http {
    static headers: any;
    static head(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static delete(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static get(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static post(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static put(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
    static patch(url: string, opts?: Http.HttpOptions): Promise<Http.Response>;
}
