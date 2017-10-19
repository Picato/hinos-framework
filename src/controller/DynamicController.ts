import { DELETE, INJECT } from 'hinos-route'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { DynamicService } from '../service/DynamicService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** LogController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class DynamicController {

  @DELETE('/:table/:_id')
  @INJECT(authoriz(`${AppConfig.path}`, ['DELETE']))
  @RESTRICT({
    params: {
      _id: Mongo.uuid,
      table: String
    }
  })
  static async del({ params, state }) {
    await DynamicService.delete(params.table, {
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}
