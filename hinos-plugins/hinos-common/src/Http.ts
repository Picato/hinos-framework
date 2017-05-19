import * as unirest from 'unirest';
import * as _ from 'lodash';

export namespace Http {
    export interface Response {
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

    export interface HttpOptions {
        query?: {};
        data?: any;
        headers?: {};
        attach?: {};
        field?: {};
        type?: string;
    }
}

export class Http {
    static headers: any;

    public static head(url: string, opts?: Http.HttpOptions): Promise<Http.Response> {
        return new Promise<Http.Response>((resolve, reject) => {
            _base('head', url, opts).end((resp: Http.Response) => {
                if (resp.error) return reject(resp);
                resolve(resp);
            });
        });
    }
    public static delete(url: string, opts?: Http.HttpOptions): Promise<Http.Response> {
        return new Promise<Http.Response>((resolve, reject) => {
            _base('delete', url, opts).end((resp: Http.Response) => {
                if (resp.error) return reject(resp);
                resolve(resp);
            });
        });
    }
    public static get(url: string, opts?: Http.HttpOptions): Promise<Http.Response> {
        return new Promise<Http.Response>((resolve, reject) => {
            _base('get', url, opts).end((resp: Http.Response) => {
                if (resp.error) return reject(resp);
                resolve(resp);
            });
        });
    }
    public static post(url: string, opts?: Http.HttpOptions): Promise<Http.Response> {
        return new Promise<Http.Response>((resolve, reject) => {
            _base('post', url, opts).end((resp: Http.Response) => {
                if (resp.error) return reject(resp);
                resolve(resp);
            });
        });
    }
    public static put(url: string, opts?: Http.HttpOptions): Promise<Http.Response> {
        return new Promise<Http.Response>((resolve, reject) => {
            _base('put', url, opts).end((resp: Http.Response) => {
                if (resp.error) return reject(resp);
                resolve(resp);
            });
        });
    }
    public static patch(url: string, opts?: Http.HttpOptions): Promise<Http.Response> {
        return new Promise<Http.Response>((resolve, reject) => {
            _base('patch', url, opts).end((resp: Http.Response) => {
                if (resp.error) return reject(resp);
                resolve(resp);
            });
        });
    }
}

const _base = (method: string, url: string, opts: Http.HttpOptions = {}): { end: Function } => {
    // console.log(method, url);
    let Request: any;
    if (method === 'head') Request = unirest.head(url);
    else if (method === 'delete') Request = unirest.delete(url);
    else if (method === 'get') Request = unirest.get(url);
    else if (method === 'post') Request = unirest.post(url);
    else if (method === 'put') Request = unirest.put(url);
    else throw 'Http method must be not equals null';
    Request = Request.type(opts.type || 'json');
    if (opts.query) Request = Request.query(opts.query);
    if (opts.data) Request = Request.send(opts.data);
    if (opts.headers) {
        Request = Request.headers(Http.headers ? _.merge({}, Http.headers, opts.headers) : opts.headers);
    } else if (Http.headers) {
        Request = Request.headers(Http.headers);
    }
    if (opts.field) {
        for (let k in opts.field) {
            Request = Request.field(k, opts.field[k]);
        }
    }
    if (opts.attach) {
        for (let f in opts.attach) {
            Request = Request.attach(f, opts.attach[f]);
        }
    }
    return Request;
}