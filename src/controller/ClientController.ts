import * as _ from 'lodash'
import { POST, INJECT, PUT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { Mail, MailService } from '../service/MailService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ClientController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ClientController {

  @POST('/Send/:configId')
  @INJECT(authoriz(`${AppConfig.path}`, 'SEND'))
  @BODYPARSER()
  @RESTRICT({
    params: {
      configId: Mongo.uuid
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
    delete rs.project_id
    return rs
  }

  @PUT('/Send/:templateId')
  @INJECT(authoriz(`${AppConfig.path}`, 'SEND_TEMPLATE'))
  @BODYPARSER()
  @RESTRICT({
    params: {
      templateId: Mongo.uuid
    },
    body: {
      subject: String,
      text: String,
      html: String,
      from: String,
      to: Array,
      cc: Array,
      attachments: Array,
      _this: Object // replace mail content, subject
    }
  })
  static async addFromTemplate({ body, state, params }) {
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    body.template_id = params.templateId
    const rs = await MailService.insert(_.omit(body, ['_this']), body._this) as Mail
    delete rs.project_id
    return rs
  }

}
