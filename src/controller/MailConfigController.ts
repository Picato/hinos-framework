import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { MailConfig, MailConfigService } from '../service/MailConfigService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** ConfigController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ConfigController {

  @GET('/Config')
  @INJECT(authoriz(`${AppConfig.name}>Config`, ['FIND']))
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
    const rs = await MailConfigService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

  @GET('/Config/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Config`, ['GET']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state }) {
    const rs = await MailConfigService.get({
      _id: params._id,
      project_id: state.auth.projectId
    })
    return rs
  }

  @POST('/Config')
  @INJECT(authoriz(`${AppConfig.name}>Config`, ['INSERT']))
  @BODYPARSER()
  @MATCHER({
    body: {
      name: String,
      config: Object
    }
  })
  static async add({ body, state }) {
    body.project_id = state.auth.projectId
    body.account_id = state.auth.accountId
    const rs = await MailConfigService.insert(body) as MailConfig
    return rs
  }

  @PUT('/Config/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Config`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
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
    body.account_id = state.auth.accountId
    await MailConfigService.update(body)
  }

  @DELETE('/Config/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Config`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await MailConfigService.delete({
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}