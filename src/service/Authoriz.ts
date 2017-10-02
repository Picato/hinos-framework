import { Context } from 'hinos'
import { Mongo } from 'hinos-mongo'
import axios from 'axios'
import HttpError from '../common/HttpError'

export function authoriz(path: string, actions: string[]) {
  return async ({ ctx, headers }: Context, next: Function) => {
    try {
      const res = await axios.head(`${AppConfig.services.oauth}/Oauth/Authoriz?path=${path}&actions=${actions.join(',')}`, {
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
      throw HttpError.CUSTOMIZE(e.response.status, e.response.data)
    }
  }
}
