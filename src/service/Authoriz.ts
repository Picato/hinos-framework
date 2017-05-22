import { Context } from 'hinos';
import HttpError from '../common/HttpError';
import MicroService from './MicroService';
import { Mongo } from 'hinos-mongo';

export function authoriz(pathCode: string, actions: string[]) {
    return async (ctx: Context, next: Function) => {
        if (!ctx.headers.token && !ctx.headers.secret_key) throw HttpError.AUTHEN();
        let headers: any = {
            path: pathCode,
            actions: actions.join(',')
        };
        if (ctx.headers.token) headers.token = ctx.headers.token;
        else if (ctx.headers.secret_key) headers.secret_key = ctx.headers.secret_key;
        const resp = await MicroService.checkAuthoriz(headers);
        if (resp.code !== 200) throw HttpError.CUSTOMIZE(+resp.code, resp.body);
        const token = resp.headers.token.split('-');
        ctx.state.auth = {
            projectId: Mongo.uuid(token[0]),
            accountId: Mongo.uuid(token[1]),
            token: Mongo.uuid(token[2]),
            rawToken: resp.headers.token
        };
        await next();
    }
}