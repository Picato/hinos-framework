import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { FileConfig, FileConfigService } from '../service/FileConfigService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** FileConfigController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class FileConfigController {

  @GET('/Config')
  @INJECT(authoriz(`${AppConfig.path}/Config`, ['FIND']))
  @RESTRICT({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query, state }) {
    let where = {
      project_id: state.auth.projectId
    }
    const rs = await FileConfigService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $fields: { project_id: 0 }
    })
    return rs
  }

  @POST('/Config')
  @INJECT(authoriz(`${AppConfig.path}/Config`, ['INSERT']))
  @BODYPARSER()
  @RESTRICT({
    body: {
      name: String,
      config: Object
    }
  })
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await FileConfigService.insert(body) as FileConfig
    return rs
  }

  @PUT('/Config/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Config`, ['UPDATE']))
  @BODYPARSER()
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    },
    body: {
      name: String,
      config: Object
    }
  })
  static async update({ params, body, state }) {
    body._id = {
      _id: params._id,
      project_id: state.auth.projectId
    }
    await FileConfigService.update(body)
  }

  @DELETE('/Config/:_id')
  @INJECT(authoriz(`${AppConfig.path}/Config`, ['DELETE']))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await FileConfigService.delete({
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}
