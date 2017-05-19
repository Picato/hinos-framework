import * as http from 'http';
import * as stream from 'stream';

export interface Request extends http.IncomingMessage {

}
export interface Response extends http.ServerResponse {

}

export class Context {
    routed: boolean; // Check routed or not
    // Request
    params: any;
    query: any;
    body: any;

    get headers() {
        return this.req.headers;
    }

    // Response    
    private _headers: any = {};
    private status: number = 0;
    data: any;
    state: any;

    set message(msg: string) {
        this.res.statusMessage = msg;
    }

    set contentType(ctype: string) {
        this._headers['Content-Type'] = ctype;
    }

    get contentType() {
        return this._headers['Content-Type']
    }

    constructor(public req: Request, public res: Response) { }

    redirect(url: string) {
        this.status = 302;
        this.set({ 'Location': url });
    }

    is(type0: string, type1?: string, type2?: string): boolean {
        const ctype = this.req.headers['content-type'];
        if (ctype.includes(type0)) return true;
        if (!type1) return false;
        if (ctype.includes(type1)) return true;
        if (!type2) return false;
        return ctype.includes(type2);
    }

    set(headers: { [propName: string]: string | string[] }) {
        for (let k in headers) {
            this._headers[k] = headers[k];
        }
    }

    get(key: string): string {
        return this._headers[key];
    }

    response() {
        if (!this.routed) {
            this.status = 404;
            this.res.writeHead(this.status, this._headers);
            return this.res.end();
        }
        if (this.data !== null && this.data !== undefined) {
            if (!this.status) this.status = 200;
            if (typeof this.data === 'string') {
                const responseBody: string = this.data;
                if (!this._headers['Content-Type']) this._headers['Content-Type'] = 'text/plain';
                this._headers['Content-Length'] = Buffer.byteLength(responseBody).toString();
                this.res.writeHead(this.status, this._headers);
                return this.res.end(responseBody);
            }
            if (this.data instanceof Buffer) {
                const responseBody: Buffer = this.data;
                this._headers['Content-Length'] = responseBody.byteLength.toString();
                this.res.writeHead(this.status, this._headers);
                return this.res.end(responseBody);
            }
            if (this.data instanceof stream.Readable) {
                this.res.writeHead(this.status, this._headers);
                return (<stream.Readable>this.data).pipe(this.res);
            }
            const responseBody: string = JSON.stringify(this.data);
            if (!this._headers['Content-Type']) this._headers['Content-Type'] = 'application/json';
            this._headers['Content-Length'] = Buffer.byteLength(responseBody).toString();
            this.res.writeHead(this.status, this._headers);
            return this.res.end(responseBody);
        }
        if (!this.status) {
            this.status = 204;
            this.res.writeHead(this.status, this._headers);
            return this.res.end();
        }
        this.res.writeHead(this.status, this._headers);
        this.res.end();
    }

}