import { Context } from 'hinos'
import { Mongo } from 'hinos-mongo'
import axios from 'axios'
import HttpError from '../common/HttpError'

export function authoriz(path: string, actions: string[]) {
  return async ({ ctx, headers }: Context, next: Function) => {
    try {
      const res = await axios.head(`${AppConfig.services.oauth}/oauth/authoriz?path=${path}&actions=${actions.join(',')}`, {
        headers: {
          token: headers.token
        }
      })
      ctx.state.auth = {
        token: headers.token,
        projectId: Mongo.uuid(res.headers.project_id),
        accountId: Mongo.uuid(res.headers.account_id)
      }
      await next()
    } catch (e) {
      if (e instanceof HttpError) throw e
      if (e.response) throw HttpError.CUSTOMIZE(e.response.status, e.response.data)
      throw e
    }
  }
}

export function suAuthoriz() {
  return async ({ headers }: Context, next: Function) => {
    try {
      const res = await axios.head(`${AppConfig.services.oauth}/oauth/authoriz`, {
        headers: {
          token: headers.token
        }
      })
      if (Object.keys(res.headers).includes('token')) throw HttpError.AUTHORIZ('This api need super admin permission')
      await next()
    } catch (e) {
      if (e instanceof HttpError) throw e
      if (e.response) throw HttpError.CUSTOMIZE(e.response.status, e.response.data)
      throw e
    }
  }
}
