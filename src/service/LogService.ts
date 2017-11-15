import axios from 'axios'
import HttpError from '../common/HttpError'

/************************************************
 ** SpendingsService || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class LogService {

  static async push(log, auth) {
    try {
      await axios.post(`${AppConfig.services.log}/log`, log, {
        headers: {
          token: auth.token
        }
      })
    } catch (e) {
      throw HttpError.CUSTOMIZE(e.status, e.error)
    }
  }

}
