import { Context } from 'hinos'
import { Mongo } from 'hinos-mongo'
import axios from 'axios'
import HttpError from '../common/HttpError'

export function authoriz(path: string, action: string) {
  return async ({ ctx, headers }: Context, next: Function) => {
    const token = headers.token
    if (!token) throw HttpError.AUTHEN()
    try {
      const res = await axios.head(`${AppConfig.services.oauth}/oauth/Authoriz`, {
        params: { path, action },
        headers: { token }
      })
      ctx.state.auth = {
        token,
        projectId: Mongo.uuid(res.headers.project_id),
        accountId: Mongo.uuid(res.headers.account_id)
      }
      await next()
    } catch (e) {
      if (e.response) throw HttpError.CUSTOMIZE(e.response.status, e.response.data)
      throw e
    }
  }
}

export function suAuthoriz() {
  return async ({ headers }: Context, next: Function) => {
    if (headers.token && headers.token === AppConfig.app.suid) return await next()
    throw HttpError.AUTHORIZ()
  }
}

