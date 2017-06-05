"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function authoriz(pathCode, actions) {
    return async (ctx, next) => {
        await next();
    };
}
exports.authoriz = authoriz;
//# sourceMappingURL=Authoriz.js.map