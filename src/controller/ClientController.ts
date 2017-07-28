import { POST, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Uuid } from 'hinos-mongo'
import { Mail, MailService } from '../service/MailService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ClientController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ClientController {

  @POST('/Send/:configId')
  @INJECT(authoriz(`${AppConfig.name}>Mail`, ['SEND']))
  @BODYPARSER()
  @MATCHER({
    params: {
      configId: Uuid
    },
    body: {
      subject: String,
      text: String,
      html: String,
      from: String,
      to: Array,
      cc: Array,
      attachments: Array
    }
  })
  static async add({ body, state, params }) {
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    body.config_id = params.configId
    const rs = await MailService.insert(body) as Mail
    return rs
  }

}
