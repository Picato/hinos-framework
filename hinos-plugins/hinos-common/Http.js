"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unirest = require("unirest");
const _ = require("lodash");
class Http {
    static head(url, opts) {
        return new Promise((resolve, reject) => {
            _base('head', url, opts).end((resp) => {
                if (resp.error)
                    return reject(resp);
                resolve(resp);
            });
        });
    }
    static delete(url, opts) {
        return new Promise((resolve, reject) => {
            _base('delete', url, opts).end((resp) => {
                if (resp.error)
                    return reject(resp);
                resolve(resp);
            });
        });
    }
    static get(url, opts) {
        return new Promise((resolve, reject) => {
            _base('get', url, opts).end((resp) => {
                if (resp.error)
                    return reject(resp);
                resolve(resp);
            });
        });
    }
    static post(url, opts) {
        return new Promise((resolve, reject) => {
            _base('post', url, opts).end((resp) => {
                if (resp.error)
                    return reject(resp);
                resolve(resp);
            });
        });
    }
    static put(url, opts) {
        return new Promise((resolve, reject) => {
            _base('put', url, opts).end((resp) => {
                if (resp.error)
                    return reject(resp);
                resolve(resp);
            });
        });
    }
    static patch(url, opts) {
        return new Promise((resolve, reject) => {
            _base('patch', url, opts).end((resp) => {
                if (resp.error)
                    return reject(resp);
                resolve(resp);
            });
        });
    }
}
exports.Http = Http;
const _base = (method, url, opts = {}) => {
    // console.log(method, url);
    let Request;
    if (method === 'head')
        Request = unirest.head(url);
    else if (method === 'delete')
        Request = unirest.delete(url);
    else if (method === 'get')
        Request = unirest.get(url);
    else if (method === 'post')
        Request = unirest.post(url);
    else if (method === 'put')
        Request = unirest.put(url);
    else
        throw 'Http method must be not equals null';
    Request = Request.type(opts.type || 'json');
    if (opts.query)
        Request = Request.query(opts.query);
    if (opts.data)
        Request = Request.send(opts.data);
    if (opts.headers) {
        Request = Request.headers(Http.headers ? _.merge({}, Http.headers, opts.headers) : opts.headers);
    }
    else if (Http.headers) {
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
};
