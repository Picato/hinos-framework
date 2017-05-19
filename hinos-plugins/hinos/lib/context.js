"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream = require("stream");
class Context {
    constructor(req, res) {
        this.req = req;
        this.res = res;
        // Response    
        this._headers = {};
        this.status = 0;
    }
    get headers() {
        return this.req.headers;
    }
    set message(msg) {
        this.res.statusMessage = msg;
    }
    set contentType(ctype) {
        this._headers['Content-Type'] = ctype;
    }
    get contentType() {
        return this._headers['Content-Type'];
    }
    redirect(url) {
        this.status = 302;
        this.set({ 'Location': url });
    }
    is(type0, type1, type2) {
        const ctype = this.req.headers['content-type'];
        if (ctype.includes(type0))
            return true;
        if (!type1)
            return false;
        if (ctype.includes(type1))
            return true;
        if (!type2)
            return false;
        return ctype.includes(type2);
    }
    set(headers) {
        for (let k in headers) {
            this._headers[k] = headers[k];
        }
    }
    get(key) {
        return this._headers[key];
    }
    response() {
        if (!this.routed) {
            this.status = 404;
            this.res.writeHead(this.status, this._headers);
            return this.res.end();
        }
        if (this.data !== null && this.data !== undefined) {
            if (!this.status)
                this.status = 200;
            if (typeof this.data === 'string') {
                const responseBody = this.data;
                if (!this._headers['Content-Type'])
                    this._headers['Content-Type'] = 'text/plain';
                this._headers['Content-Length'] = Buffer.byteLength(responseBody).toString();
                this.res.writeHead(this.status, this._headers);
                return this.res.end(responseBody);
            }
            if (this.data instanceof Buffer) {
                const responseBody = this.data;
                this._headers['Content-Length'] = responseBody.byteLength.toString();
                this.res.writeHead(this.status, this._headers);
                return this.res.end(responseBody);
            }
            if (this.data instanceof stream.Readable) {
                this.res.writeHead(this.status, this._headers);
                return this.data.pipe(this.res);
            }
            const responseBody = JSON.stringify(this.data);
            if (!this._headers['Content-Type'])
                this._headers['Content-Type'] = 'application/json';
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
exports.Context = Context;
