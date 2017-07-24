import { Context } from 'hinos'

export function authoriz(pathCode: string, actions: string[]) {
  return async ({ ctx, headers }: Context, next: Function) => {
    console.log(pathCode, actions, ctx, headers)
    await next()
  }
}
