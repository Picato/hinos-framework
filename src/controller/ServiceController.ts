import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { Service, ServiceService } from '../service/ServiceService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ServiceController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ServiceController {

  @GET('/Service')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query }) {
    let where = {}
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
  static async add({ body }) {
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
  static async del({ params }) {
    await ServiceService.delete(params._id)
  }

}
