import { GET, POST, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { MonitorConfigService } from '../service/MonitorConfigService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ServiceController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class MonitorConfigController {

  @GET('/MonitorConfig')
  @INJECT(authoriz(`${AppConfig.path}/Config`, 'GET'))
  static async getConfig({ state }) {
    return await MonitorConfigService.get(state.auth.projectId)
  }

  @POST('/MonitorConfig')
  @INJECT(authoriz(`${AppConfig.path}/Config`, 'CONFIG'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      mail_to: Array,
      mail_template_id: Mongo.uuid,
      enabled: Boolean
    }
  })
  static async config({ body, state }) {
    body.project_id = state.auth.projectId
    await MonitorConfigService.config(body, state.auth)
  }

}
