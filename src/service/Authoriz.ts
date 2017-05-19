import { Context } from 'hinos';

export function authoriz(pathCode: string, actions: string[]) {
    return async (ctx: Context, next: Function) => {
        await next();
    }
}