import { GET, INJECT } from 'hinos-route'
import { MATCHER } from 'hinos-requestmatcher'
import { LogService } from '../service/LogService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** LogController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class LogController {

  @GET('/Log')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query }) {
    let where = {}
    const rs = await LogService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

}
