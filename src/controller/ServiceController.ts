import { GET, POST, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { ServiceService } from '../service/ServiceService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ServiceController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ServiceController {

  @GET('/WSSession')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['SESSION']))
  static async getWebsocketSession({ state }) {
    return state.auth.projectId.toString()
  }

  @GET('/Service')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query, state }) {
    let where: any = {}
    where.project_id = state.auth.projectId
    const rs = await ServiceService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

  @POST('/Service')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['INSERT']))
  @BODYPARSER()
  @MATCHER({
    body: {
      name: String,
      link: String,
      status: Number
    }
  })
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    const rs = await ServiceService.insert(body)
    return rs
  }

  @DELETE('/Service/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await ServiceService.delete({
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}
