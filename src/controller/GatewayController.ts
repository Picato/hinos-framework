import { GET, PUT, DELETE, INJECT, ALL, POST } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { GatewayService } from '../service/GatewayService'
import { authoriz } from '../service/Authoriz'
import { HASHER } from 'hinos-requesthasher'

/************************************************
 ** gatewayController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class gatewayController {

  @GET('/Service')
  @HASHER()
  @INJECT(authoriz(`${AppConfig.path}`, 'FIND'))
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

  @PUT('/Service')
  @HASHER()
  @INJECT(authoriz(`${AppConfig.path}`, 'UPDATE'))
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

  @DELETE('/Service/:_id')
  @HASHER()
  @INJECT(authoriz(`${AppConfig.path}`, 'DELETE'))
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

  @POST('/Forward')
  @HASHER()
  @BODYPARSER()
  static async forwardRequest({ body, ctx }) {
    try {
      const rs = await GatewayService.forwardRequest(body) as any
      delete rs.request
      return rs
    } catch (rs) {
      delete rs.response.request
      delete rs.request
      ctx.status = 500
      return rs
    }
  }

  @GET('/Forward')
  static async forwardGetRequest({ ctx }) {
    try {
      const opts = JSON.parse(ctx.query.opts)
      const res = await GatewayService.forwardRequest(opts) as any
      return res.data
    } catch (rs) {
      delete rs.response.request
      delete rs.request
      ctx.status = 500
      return rs
    }
  }

  @ALL(/^\/([^\/]+)/i)
  static async gateway(ctx) {
    ctx.params.service = ctx.params[0].split('/')[0].toLowerCase()
    return await GatewayService.forward(ctx)
  }

}
