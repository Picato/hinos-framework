import { Context } from 'hinos'
import HttpError from '../common/HttpError'
import { Mongo } from 'hinos-mongo'

export function authoriz(pathCode: string, actions: string[]) {
  return async ({ ctx, headers }: Context, next: Function) => {
    await next()
  }
}
