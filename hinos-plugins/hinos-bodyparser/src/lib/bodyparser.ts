import { Context } from 'hinos';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as querystring from 'querystring';
import * as multer from 'multer';
import * as Jimp from 'jimp';
import { v4 } from 'uuid';

export interface ImageResize {
    w?: number,
    h?: number,
    ext?: string
}

export namespace BodyParser {
    export interface MultipartOptions {
        returnType?: Object | String,
        returnPath?: string,
        name: string,
        uploadDir?: string,
        maxCount?: number,
        preservePath?: boolean,
        limit?: {
            fieldNameSize?: number;
            fieldSize?: number
            fields?: number;
            fileSize?: number;
            files?: number;
            parts?: number;
            headerPairs?: number;
        },
        resize?: Array<ImageResize>
    }
}

export function BODYPARSER(opts?: Array<BodyParser.MultipartOptions>): Function {
    return function (target: Function, fieldName: String, func: TypedPropertyDescriptor<Function>) {
        if (!func.value['mid']) func.value['mid'] = [];
        func.value['mid'].splice(0, 0, async (ctx: Context, next: Function) => {
            const method = ctx.req.method;
            if (method === 'GET' || method === 'DELETE' || method === 'HEAD') return;
            if (ctx.is('json')) {
                ctx.body = await bodyParser(ctx, 0);
            } else if (ctx.is('multipart')) {
                ctx.body = await bodyPartParser(ctx, opts);
            } else if (ctx.is('urlencoded')) {
                ctx.body = await bodyParser(ctx, 1);
            } else {
                ctx.body = await bodyRawParser(ctx);
            }
            await next();
        });
    }
}
function convertToFormArray(obj) {
    let k;
    for (k in obj) {
        if (k.indexOf('[') !== -1) {
            const m = k.match(/([^\[]+)\[(\d+)\]/);
            if (m) {
                if (!obj[m[1]]) obj[m[1]] = [];
                obj[m[1]][+m[2]] = obj[k];
                delete obj[k];
            }
        }
    }
    return obj;
}
function bodyParser(ctx: Context, type: number): Promise<any> {
    const req = ctx.req;
    return new Promise((resolve, reject) => {
        let queryData = [];

        req.on('data', function (data) {
            queryData.push(data);
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('end', function () {
            const dataStr = queryData.join('');
            if (type === 0) return resolve(JSON.parse(queryData.join('')));
            const str = queryData.join('');
            if (!/\[\d+\]/.test(str)) return resolve(querystring.parse(str));
            resolve(convertToFormArray(querystring.parse(str)))
        });
    });
}
function bodyRawParser(ctx: Context): Promise<Buffer> {
    const req = ctx.req;
    return new Promise<Buffer>((resolve, reject) => {
        let buf = Buffer.alloc(0);

        req.on('data', function (data: Buffer) {
            buf = Buffer.concat([buf, data]);
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.on('end', function () {
            resolve(buf);
        });
    });
}
async function bodyPartParser(ctx: Context, options: Array<BodyParser.MultipartOptions>) {
    const req = ctx.req, res = ctx.res;
    let handler = (uploadHanlder) => {
        return new Promise(async (resolve, reject) => {
            await uploadHanlder(req, res, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const opt = options.find(e => e.name === file.fieldname);
            if (!opt) return cb(`Could not found config file for ${file.fieldname}`);
            file.opt = opt;
            cb(null, opt.uploadDir);
        },
        filename: function (req, file, cb) {
            const opt = file.opt;
            const fileName = v4() + path.extname(file.originalname);
            file.httpPath = path.join(opt.returnPath, fileName).replace(/\\/, '/');
            cb(null, fileName);
        }
    });
    const upload = multer({ storage });
    await handler(upload.fields(options));
    let body = ctx.req['body'] || {};
    for (let opt of options) {
        if (opt.maxCount > 1) {
            body[opt.name] = req['files'][opt.name];
            if (opt.resize)
                for (let f of body[opt.name])
                    await resizeImage(f.path, opt.resize);
            if (!opt.returnType || opt.returnType === String) body[opt.name] = body[opt.name].map(e => e.httpPath);
        } else {
            body[opt.name] = req['files'][opt.name][0];
            if (opt.resize) await resizeImage(body[opt.name].path, opt.resize);
            if (!opt.returnType || opt.returnType === String) body[opt.name] = body[opt.name].httpPath;
        }
    }
    req['files'] = null;
    req['body'] = null;
    return body;
}
async function resizeImage(file, sizes) {
    let image0 = await Jimp.read(file);
    if (!(sizes instanceof Array)) sizes = [sizes];
    const resizeImg = (size) => {
        return new Promise<string>((resolve, reject) => {
            try {
                if (!size.w && !size.h) return reject('Need enter size to resize image');
                let image = image0.clone();
                const fileout = file.substr(0, file.lastIndexOf('.')) + (size.ext ? ('.' + size.ext) : '') + file.substr(file.lastIndexOf('.'));
                if (size.h < 0) {
                    size.h = Math.abs(size.h);
                    size.h = image.bitmap.height > size.h ? size.h : image.bitmap.height;
                }
                if (size.w < 0) {
                    size.w = Math.abs(size.w);
                    size.w = image.bitmap.width > size.w ? size.w : image.bitmap.width;
                }
                if (!size.w) size.w = size.h * image.bitmap.width / image.bitmap.height;
                if (!size.h) size.h = size.w * image.bitmap.height / image.bitmap.width;
                if (size.ratio) {
                    size.w *= size.ratio;
                    size.h *= size.ratio;
                }
                image.cover(size.w, size.h).quality(size.quality || 100).write(fileout, () => {
                    image = null;
                    resolve(fileout);
                });
            } catch (e) {
                reject(e);
            }
        });
    }
    return await Promise.all(sizes.map(resizeImg));
}