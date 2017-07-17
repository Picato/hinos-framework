import { Context } from 'hinos'
import HttpError from '../common/HttpError'
import { Http } from 'hinos-common/Http'
import MicroService from './MicroService'
import { Mongo, Uuid } from 'hinos-mongo'

export function authoriz(path: string, actions: string[]) {
  return async ({ ctx, headers }, next: Function) => {
    const res: Http.Response = await Http.head(`${AppConfig.services.oauth}/Oauth/Authoriz?path=${path}&actions=${actions.join(',')}`, {
      headers: {
        token: headers.token
      }
    })
    if (res.statusCode !== 204) throw HttpError.INTERNAL(res.error)
    ctx.state.auth = {
      token: res.headers.token,
      projectId: Mongo.uuid(res.headers.project_id),
      accountId: Mongo.uuid(res.headers.account_id)
    }
    await next()
  }
}