import { GET, INJECT } from 'hinos-route'
import { GlobalService } from '../service/GlobalService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** MailController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class MailController {

  @GET('/ExportDB')
  @INJECT(authoriz(`${AppConfig.path}`, 'EXPORT'))
  static async export({ state }) {
    return await GlobalService.export(state.auth)
  }
}
