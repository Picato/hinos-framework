import { DELETE, INJECT } from 'hinos-route'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { LogService } from '../service/LogService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** LogController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class LogController {

  @DELETE('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await LogService.delete({
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}
