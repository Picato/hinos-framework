import * as _ from 'lodash';

export function MATCHER({ query = <object>null, params = <object>null, body = <object>null }): Function {
    return function (target: Function, fieldName: String, func: TypedPropertyDescriptor<Function>) {
        if (!func.value['mid']) func.value['mid'] = [];
        func.value['mid'].splice(0, 0, async (ctx, next) => {
            if (params) ctx.params = await applyValue(params, ctx.params);
            if (query) ctx.query = await applyValue(query, ctx.query);
            if (body) {
                if (!(body instanceof Array) && !(ctx.body instanceof Array)) {
                    ctx.body = await applyValue(body, ctx.body);
                } else if (body instanceof Array && ctx.body instanceof Array) {
                    for (let i = 0, length = ctx.body.length; i < length; i++) {
                        ctx.body[i] = await applyValue(body[0], ctx.body[i]);
                    }
                } else {
                    const err: any = new Error('Matcher is not valid');
                    err.status = 406;
                    throw err;
                }
            }
            await next();
        });
    }
}
async function applyValue(schema: any, body: any): Promise<void> {
    let type, value, rs: any = {};
    if (body) {
        for (let field in schema) {
            type = schema[field];
            value = body[field];
            if (value !== undefined) {
                if (type === String) {
                    rs[field] = value ? value.toString() : value;
                } else if (type === Number) {
                    rs[field] = value ? +value : value;
                } else if (type === Object || type === Array) {
                    rs[field] = toObject(value);
                } else if (type === Boolean) {
                    rs[field] = toBool(value);
                } else if (type === Date) {
                    rs[field] = toDate(value);
                } else if (typeof type === 'function' && !_.isNil(value)) {
                    rs[field] = await type(value);
                }
            }
        }
    }
    return rs;
}

function toDate(date) {
    if (!date) return date;
    return date instanceof Date ? date : new Date(date);
}
function toBool(bol) {
    if (typeof bol === 'string') return bol.toLowerCase() === 'true';
    return !!bol;
}
function toObject(obj) {
    try {
        if (!obj) return obj;
        if (typeof obj === 'string') obj = JSON.parse(obj);
        let props;
        for (let fieldName in obj) {
            props = obj[fieldName];
            // if (typeof props === 'obj') {
            //     obj[fieldName] = obj(obj[fieldName]);
            // } else 
            if (typeof props === 'string' && /^\d{4}-\d{1,2}-\d{1,2}T\d{1,2}:\d{1,2}:\d{1,2}\.\d{1,3}Z$/.test(props)) {
                obj[fieldName] = toDate(obj[fieldName]);
            }
        }
        return obj;
    } catch (e) {
        e.status = 400;
        throw e;
    }
}