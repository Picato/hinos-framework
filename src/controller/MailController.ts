import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { MailService } from '../service/MailService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** MailController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class MailController {

  @POST('/Test')
  @INJECT(authoriz(`${AppConfig.path}`, 'Test'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      name: String,
      to: String,
      config: Object
    }
  })
  static async test({ body }) {
    await MailService.test({
      from: body.name,
      to: [body.to],
      subject: 'Ping server',
      text: 'Test email sending'
    }, body.config)
  }

  @PUT('/Resend/:_id')
  @INJECT(authoriz(`${AppConfig.path}`, 'RESEND'))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    },
    body: {
      config: Object,
      config_id: Mongo.uuid
    }
  })
  static async resend({ params, state, body }) {
    await MailService.resend({
      _id: {
        _id: params._id,
        project_id: state.auth.projectId
      },
      config: body.config,
      config_id: body.config_id,
      account_id: state.auth.accountId
    })
  }

  @GET('/')
  @INJECT(authoriz(`${AppConfig.path}`, 'FIND'))
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
    let fields: any = (query.fields && Object.keys(query.fields).length > 0) ? query.fields : { text: 0, html: 0, project_id: 0 }
    const rs = await MailService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage,
      $sort: {
        updated_at: -1
      },
      $fields: fields
    })
    return rs
  }

  @GET('/:_id')
  @INJECT(authoriz(`${AppConfig.path}`, 'GET'))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state, query }) {
    let fields: any = (query.fields && Object.keys(query.fields).length > 0) ? query.fields : { project_id: 0 }
    const rs = await MailService.get({
      _id: params._id,
      project_id: state.auth.projectId
    }, fields)
    return rs
  }

  @DELETE('/:_id')
  @INJECT(authoriz(`${AppConfig.path}`, 'DELETE'))
  @RESTRICT({
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
