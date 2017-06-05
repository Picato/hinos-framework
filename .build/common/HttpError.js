"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HttpError extends Error {
    constructor(status, message = '') {
        super(message);
        this.status = status;
        this.message = message;
        this.expose = true;
    }
}
HttpError.BAD_REQUEST = (msg) => new HttpError(400, msg);
HttpError.NOT_FOUND = (msg) => new HttpError(404, msg);
HttpError.EXPIRED = (msg) => new HttpError(440, msg);
HttpError.AUTHEN = (msg) => new HttpError(401, msg);
HttpError.AUTHORIZ = (msg) => new HttpError(403, msg);
HttpError.INTERNAL = (msg) => new HttpError(500, msg);
HttpError.CONDITION = (msg) => new HttpError(412, msg);
HttpError.LOCKED = (msg) => new HttpError(423, msg);
HttpError.CUSTOMIZE = (code, msg) => new HttpError(code, msg);
exports.default = HttpError;
//# sourceMappingURL=HttpError.js.map