import { GET, POST, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Uuid } from 'hinos-mongo'
import { MonitorConfigService } from '../service/MonitorConfigService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ServiceController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class MonitorConfigController {

  @GET('/MonitorConfig')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['CONFIG']))
  static async getConfig() {
    return await MonitorConfigService.get()
  }

  @POST('/MonitorConfig')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['CONFIG']))
  @BODYPARSER()
  @MATCHER({
    body: {
      mail_to: Array,
      mail_config_id: Uuid
    }
  })
  static async config({ body, state }) {
    await MonitorConfigService.config(body, state.auth)
  }

  @GET('/MailConfig')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['CONFIG']))
  static async getMailConfig({ state }) {
    return await MonitorConfigService.getMailConfig(state.auth)
  }

}
