import { Context } from 'hinos'
import HttpError from '../common/HttpError'
import { Http } from 'hinos-common/Http'
import MicroService from './MicroService'
import { AccountService, AccountCached } from './AccountService'
import { Mongo, Uuid } from 'hinos-mongo'

export function authoriz(path: string, actions: string[]) {
  return async ({ ctx, headers }, next: Function) => {
    const res: Http.Response = await Http.head(`${AppConfig.url}/Authoriz?path=${path}&actions=${actions.join(',')}`, {
      headers: {
        token: headers.token
      }
    })
    if (res.statusCode !== 204) throw HttpError.INTERNAL(res.error)
    const [projectId, accountId] = res.headers.token.match(/.{1,24}/g)
    ctx.state.auth = {
      token: res.headers.token,
      projectId: Mongo.uuid(projectId),
      accountId: Mongo.uuid(accountId)
    }
    await next()
  }
}

export function suAuthoriz() {
  return async ({ headers }, next: Function) => {
    if (headers.token !== AppConfig.app.suid) throw HttpError.AUTHEN()
    await next()
  }
}