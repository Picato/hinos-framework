import { Http } from 'hinos-common/Http'
import HttpError from '../common/HttpError'

/************************************************
 ** SpendingsService || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class LogService {

  static async push(log, auth) {
    try {
      await Http.post(`${AppConfig.services.log}/log`, {
        headers: {
          token: auth.token
        },
        data: log
      })
    } catch (e) {
      throw HttpError.CUSTOMIZE(e.status, e.error)
    }
  }

}
