import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { Component, ComponentService } from '../service/ComponentService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ComponentController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ComponentController {

  @GET('/Component')
  @MATCHER({
    query: {
      name: e => {
        e = e instanceof Array ? e : [e]
        return e.map(e => e.endsWith('.zip') ? e : `${e}.zip`)
      },
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query }) {
    let where: any = {}
    if (query.name) {
      where.name = {
        $in: [query.name]
      }
    }
    const rs = await ComponentService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

  @GET('/Component/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Component`, ['GET']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params }) {
    const rs = await ComponentService.get(params._id)
    return rs
  }

  @POST('/Component')
  @INJECT(authoriz(`${AppConfig.name}>Component`, ['INSERT']))
  @BODYPARSER()
  @MATCHER({
    body: {
      file: String,
      des: String,
      group: String
    }
  })
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await ComponentService.insert(body)
    return rs
  }

  @PUT('/Component/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Component`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
    params: {
      _id: Mongo.uuid
    },
    body: {
      file: String,
      des: String,
      group: String
    }
  })
  static async update({ params, body, state }) {
    body._id = params._id
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    await ComponentService.update(body)
  }

  @DELETE('/Component/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Component`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params }) {
    await ComponentService.delete(params._id)
  }

}
