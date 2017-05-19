"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
function error(msg) {
    const err = new Error(msg);
    err.status = 400;
    err.expose = true;
    return err;
}
class Checker {
    static is(params, type, fieldName) {
        if (type instanceof Array) {
            let msgs = [];
            for (var e of type) {
                try {
                    Checker.is(params, e, fieldName);
                    return;
                }
                catch (e) {
                    msgs.push(e.message);
                }
            }
            throw error(msgs.join(' or '));
        }
        else {
            if (Number === type && isNaN(params) === true)
                throw error(`${fieldName} must be Number type`);
            else if (Date === type && !(params instanceof Date))
                throw error(`${fieldName} must be Date type`);
            else if (Boolean === type && _.isBoolean(params) !== true)
                throw error(`${fieldName} must be Boolean type`);
            else if (Array === type && _.isArray(params) !== true)
                throw error(`${fieldName} 'must be Array type`);
            else if (Object === type && _.isPlainObject(params) !== true)
                throw error(`${fieldName} 'must be Object type`);
            else if (String === type && _.isString(params) !== true)
                throw error(`${fieldName} 'must be String type`);
        }
    }
    static option(fieldName, value, type, fcDone, fcNoData) {
        if (!Checker.has(value))
            return fcNoData ? fcNoData() : null;
        if (type)
            Checker.is(value, type, fieldName);
        if (fcDone)
            fcDone(value);
    }
    static must(fieldName, value, type, defaultValue) {
        if (!Checker.has(value)) {
            if (Checker.has(defaultValue))
                value = defaultValue;
            else
                throw error(`${fieldName} is required`);
        }
        if (type)
            Checker.is(value, type, fieldName);
        return value;
    }
    static has(value) {
        if (_.isNil(value) || (typeof value === 'string' && value.length === 0))
            return false;
        return true;
    }
}
exports.Checker = Checker;
