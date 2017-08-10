import { GET, PUT, DELETE, INJECT, ALL } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { GatewayService } from '../service/GatewayService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** GatewayController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class GatewayController {

  @GET('/Gateway/Service')
  @INJECT(authoriz(`${AppConfig.name}>Gateway`, ['FIND']))
  @RESTRICT({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query, state }) {
    let where: any = {}
    if (state.auth) where.project_id = state.auth.projectId
    else where.project_id = { $exists: false }
    const rs = await GatewayService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

  @PUT('/Gateway/Service')
  @INJECT(authoriz(`${AppConfig.name}>Gateway`, ['UPDATE']))
  @BODYPARSER()
  @RESTRICT({
    body: {
      name: e => e.toLowerCase(),
      link: e => e.toLowerCase()
    }
  })
  static async add({ body, state }) {
    if (state.auth) {
      body.project_id = state.auth.projectId
      body.account_id = state.auth.accountId
    }
    const rs = await GatewayService.insert(body)
    return rs
  }

  @DELETE('/Gateway/Service/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Gateway`, ['DELETE']))
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    let where: any = {}
    if (state.auth) {
      where._id = {
        _id: params._id,
        project_id: state.auth.projectId
      }
    } else {
      where._id = params._id
    }
    await GatewayService.delete(where)
  }

  @ALL(/^\/([^\/]+)/i)
  static async gateway(ctx) {
    ctx.params.service = ctx.params[0].split('/')[0].toLowerCase()
    return await GatewayService.forward(ctx)
  }

}
