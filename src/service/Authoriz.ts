import { Context } from 'hinos'
import { Mongo } from 'hinos-mongo'
import axios from 'axios'
import HttpError from '../common/HttpError'

export function authoriz(path: string, actions: string[]) {
  return async ({ ctx, headers }: Context, next: Function) => {
    const res = await axios.head(`${AppConfig.services.oauth}/Oauth/Authoriz?path=${path}&actions=${actions.join(',')}`, {
      headers: {
        token: headers.token
      }
    })
    if (res.status !== 204) throw HttpError.CUSTOMIZE(res.status, res.data || res.statusText)
    ctx.state.auth = {
      token: res.headers.token,
      projectId: Mongo.uuid(res.headers.project_id),
      accountId: Mongo.uuid(res.headers.account_id)
    }
    await next()
  }
}

export function suAuthoriz() {
  return async ({ headers }: Context, next: Function) => {
    const res = await axios.head(`${AppConfig.services.oauth}/Oauth/Authoriz`, {
      headers: {
        token: headers.token
      }
    })
    if (res.status !== 204) throw HttpError.INTERNAL(res.data || res.statusText)
    if (Object.keys(res.headers).includes('token')) throw HttpError.AUTHORIZ('This api need super admin permission')
    await next()
  }
}
