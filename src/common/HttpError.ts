// import * as statuses from 'statuses';
// statuses['440'] = 'Session expired';

export default class HttpError extends Error {
    static BAD_REQUEST = (msg?) => new HttpError(400, msg);
    static NOT_FOUND = (msg?) => new HttpError(404, msg);
    static EXPIRED = (msg?) => new HttpError(440, msg);
    static AUTHEN = (msg?) => new HttpError(401, msg);
    static AUTHORIZ = (msg?) => new HttpError(403, msg);
    static INTERNAL = (msg?) => new HttpError(500, msg);
    static CONDITION = (msg?) => new HttpError(412, msg);
    static LOCKED = (msg?) => new HttpError(423, msg);
    static CUSTOMIZE = (code: number, msg?) => new HttpError(code, msg);

    expose: boolean = true;

    constructor(public readonly status: number, readonly message: any = '') {
        super(message);
    }
}