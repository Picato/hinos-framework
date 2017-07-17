import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { Log, LogService } from '../service/LogService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** LogController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class LogController {

  @GET('/')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query, state }) {
    let where = {
      project_id: state.auth.projectId
    }
    const rs = await LogService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: {
        updated_at: -1
      }
    })
    return rs
  }

  @GET('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['GET']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state }) {
    const rs = await LogService.get({
      _id: params._id,
      project_id: state.auth.projectId
    })
    return rs
  }

  @POST('/')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['INSERT']))
  @BODYPARSER()
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await LogService.insert(body) as Log
    return rs
  }

  @PUT('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Log`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async update({ params, body, state }) {
    body._id = {
      _id: params._id,
      project_id: state.auth.projectId
    }
    body.account_id = state.auth.accountId
    delete body.created_at
    delete body.updated_at
    delete body.type
    delete body.project_id
    delete body.title
    // Just allow update status and customize fields
    await LogService.update(body)
  }

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
