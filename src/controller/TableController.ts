import { GET, POST, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { TableService } from '../service/TableService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** TableController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class TableController {

  @GET('/Table')
  @INJECT(authoriz(`${AppConfig.path}/Table`, 'FIND'))
  static async find({ state }) {
    const rs = await TableService.find(state.auth.projectId)
    return rs
  }

  @POST('/Table')
  @INJECT(authoriz(`${AppConfig.path}/Table`, 'INSERT'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      name: String
    }
  })
  static async add({ body, state }) {
    const rs = await TableService.insert(body.name, state.auth.projectId)
    return rs
  }

  @DELETE('/Table/:name')
  @INJECT(authoriz(`${AppConfig.path}/Table`, 'DELETE'))
  @RESTRICT({
    params: {
      name: String
    }
  })
  static async del({ params, state }) {
    await TableService.delete(state.auth.projectId, params.name)
  }

}
