import { GET, POST, DELETE, INJECT, ALL } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { GatewayService } from '../service/GatewayService'
import { authoriz } from '../service/Authoriz'
import * as fs from 'fs'

/************************************************
 ** GatewayController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class GatewayController {

  @GET('/Gateway/GUI')
  static async getGUI() {
    return fs.createReadStream('./assets/GUI.zip')
  }

  @GET('/Gateway/Service')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['FIND']))
  @MATCHER({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
  static async find({ query }) {
    let where = {}
    const rs = await GatewayService.find({
      $where: where,
      $page: query.page,
      $recordsPerPage: query.recordsPerPage
    })
    return rs
  }

  @POST('/Gateway/Service')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['INSERT']))
  @BODYPARSER()
  @MATCHER({
    body: {
      name: String,
      link: String
    }
  })
  static async add({ body }) {
    const rs = await GatewayService.insert(body)
    return rs
  }

  @DELETE('/Gateway/Service/:_id')
  @INJECT(authoriz(`${AppConfig.name}>Service`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params }) {
    await GatewayService.delete(params._id)
  }

  @ALL(/^\/([^\/]+)/i)
  static async gateway(ctx) {
    ctx.params.service = ctx.params[0].split('/')[0].toLowerCase()
    return await GatewayService.forward(ctx)
  }

}
