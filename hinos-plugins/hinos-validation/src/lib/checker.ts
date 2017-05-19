import * as _ from 'lodash';

function error(msg: string) {
    const err: any = new Error(msg);
    err.status = 400;
    err.expose = true;
    return err;
}

export class Checker {
    public static is(params, type, fieldName) {
        if (type instanceof Array) {
            let msgs: Array<string> = [];
            for (var e of type) {
                try {
                    Checker.is(params, e, fieldName);
                    return;
                } catch (e) {
                    msgs.push(e.message);
                }
            }
            throw error(msgs.join(' or '));
        } else {
            if (Number === type && isNaN(params) === true) throw error(`${fieldName} must be Number type`);
            else if (Date === type && !(params instanceof Date)) throw error(`${fieldName} must be Date type`);
            else if (Boolean === type && _.isBoolean(params) !== true) throw error(`${fieldName} must be Boolean type`);
            else if (Array === type && _.isArray(params) !== true) throw error(`${fieldName} 'must be Array type`);
            else if (Object === type && _.isPlainObject(params) !== true) throw error(`${fieldName} 'must be Object type`);
            else if (String === type && _.isString(params) !== true) throw error(`${fieldName} 'must be String type`);
        }
    }
    public static option(fieldName: string, value: any, type: any, fcDone?: Function, fcNoData?: Function) {
        if (!Checker.has(value)) return fcNoData ? fcNoData() : null;
        if (type) Checker.is(value, type, fieldName);
        if (fcDone) fcDone(value);
    }
    public static must(fieldName: string, value: any, type: any, defaultValue?: any) {
        if (!Checker.has(value)) {
            if (Checker.has(defaultValue)) value = defaultValue;
            else throw error(`${fieldName} is required`);
        }
        if (type) Checker.is(value, type, fieldName);
        return value;
    }
    public static has(value) {
        if (_.isNil(value) || (typeof value === 'string' && value.length === 0)) return false;
        return true;
    }
}