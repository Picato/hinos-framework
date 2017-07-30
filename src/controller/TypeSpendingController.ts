import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { MATCHER } from 'hinos-requestmatcher'
import { BODYPARSER } from 'hinos-bodyparser'
import { Mongo } from 'hinos-mongo'
import { TypeSpendingsService } from '../service/TypeSpendingsService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** TypeSpendingsController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export default class TypeSpendingsController {

  @GET('/TypeSpendings')
  @INJECT(authoriz(`${AppConfig.name}>TypeSpendings`, ['FIND']))
  @MATCHER({
    query: {
      type: Number
    }
  })
  static async find({ query, state }) {
    let where = {}
    if (query.type !== undefined) where['type_spendings.type'] = query.type
    const rs = await TypeSpendingsService.find({
      $where: where,
      $sort: {
        'type_spendings.parent_id': 1,
        'type_spendings.oder': 1,
        'type_spendings.uname': 1
      }
    }, state.auth)
    return rs
  }

  @GET('/TypeSpendings/:_id')
  @INJECT(authoriz(`${AppConfig.name}>TypeSpendings`, ['GET']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params, state }) {
    const rs = await TypeSpendingsService.get(params._id, state.auth)
    return rs
  }

  @POST('/TypeSpendings')
  @INJECT(authoriz(`${AppConfig.name}>TypeSpendings`, ['INSERT']))
  @BODYPARSER()
  @MATCHER({
    body: {
      name: String,
      icon: String,
      type: Number,
      oder: Number,
      parent_id: Mongo.uuid
    }
  })
  static async add({ body, state }) {
    const rs = await TypeSpendingsService.insert(body, state.auth)
    return rs
  }

  @PUT('/TypeSpendings/:_id')
  @INJECT(authoriz(`${AppConfig.name}>TypeSpendings`, ['UPDATE']))
  @BODYPARSER()
  @MATCHER({
    params: {
      _id: Mongo.uuid
    },
    body: {
      name: String,
      icon: String,
      type: Number,
      oder: Number,
      parent_id: Mongo.uuid
    }
  })
  static async edit({ params, body, state }) {
    body._id = params._id
    await TypeSpendingsService.update(body, state.auth)
  }

  @DELETE('/TypeSpendings/:_id')
  @INJECT(authoriz(`${AppConfig.name}>TypeSpendings`, ['DELETE']))
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params, state }) {
    await TypeSpendingsService.delete(params._id, state.auth)
  }
}
