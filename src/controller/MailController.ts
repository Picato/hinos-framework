import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { MailService } from '../service/MailService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** MailController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class MailController {

  @POST('/Test')
  @INJECT(authoriz(`${AppConfig.name}>Config`, ['Test']))
  @BODYPARSER()
  @MATCHER({
    body: {
      name: String,
      to: String,
      config: Object
    }
  })
  static async test({ body }) {
    await MailService.test({
      from: body.name,
      to: body.to,
      subject: 'Test email sending',
      text: ''
    }, body.config)
  }

  @PUT('/Resend/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Mail`, ['RESEND']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async resend({ params, state }) {
    await MailService.resend({
      _id: {
        _id: params._id,
        project_id: state.auth.projectId
      },
      account_id: state.auth.accountId
    })
  }

  @GET('/')
  @INJECT(authoriz(`${AppConfig.name}>Mail`, ['FIND']))
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
    const rs = await MailService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: {
        updated_at: -1
      },
      $fields: { text: 0, html: 0 }
    })
    return rs
  }

  @GET('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Mail`, ['GET']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state }) {
    const rs = await MailService.get({
      _id: params._id,
      project_id: state.auth.projectId
    })
    return rs
  }

  @DELETE('/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Mail`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await MailService.delete({
      _id: params._id,
      project_id: state.auth.projectId
    })
  }

}
