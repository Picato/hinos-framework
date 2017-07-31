import { GET, INJECT } from 'hinos-route'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { FilesService } from '../service/FilesService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** FilesController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class FilesController {

  @GET('/')
  @INJECT(authoriz(`${AppConfig.name}>Files`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number,
      config_id: Mongo.uuid
    }
  })
  static async find({ query, state }) {
    let where: any = {
      project_id: state.auth.projectId
    }
    if (query.config_id) where.config_id = query.config_id
    const rs = await FilesService.find({
      $where: where,
      $sort: {
        updated_at: -1
      },
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

}
