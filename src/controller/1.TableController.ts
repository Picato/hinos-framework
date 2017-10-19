import { GET, POST, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { TableService } from '../service/TableService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** TableController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class TableController {

  @GET('/Table')
  @INJECT(authoriz(`${AppConfig.path}/Table`, ['FIND']))
  @RESTRICT({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query }) {
    let where = {}
    const rs = await TableService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

  @GET('/Table/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Table`, ['GET']))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params }) {
    const rs = await TableService.get(params._id)
    return rs
  }

  @POST('/Table')
  @INJECT(authoriz(`${AppConfig.path}/Table`, ['INSERT']))
  @BODYPARSER()
  @RESTRICT({
    body: {
      name: String
    }
  })
  static async add({ body, state }) {
    body.account_id = state.auth.accountId
    body.project_id = state.auth.projectId
    const rs = await TableService.insert(body)
    return rs
  }

  @DELETE('/Table/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Table`, ['DELETE']))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await TableService.delete(state.auth.projectId, params._id)
  }

}
