"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function VALIDATE(fc, autoCall = true) {
    return (target, fieldName, func) => {
        const baseMethod = func.value;
        func.value = async (...args) => {
            if (autoCall)
                fc(...args);
            await baseMethod(...args, fc);
        };
        return func;
    };
}
exports.VALIDATE = VALIDATE;
