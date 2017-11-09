import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { ProjectService } from '../service/ProjectService'
import { authoriz, suAuthoriz } from '../service/Authoriz'

/************************************************
 ** ProjectController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ProjectController {

  ////////////////////////// SUPER ADMIN ///////////////////////////////////

  @GET('/Projects')
  @INJECT(suAuthoriz())
  static async find({ query }) {
    let where = {}
    const rs = await ProjectService.find({
      $where: where,
      $page: +query.page,
      $recordsPerPage: +query.recordsPerPage
    })
    return rs
  }

  @GET('/Project/:_id')
  @INJECT(suAuthoriz())
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params }) {
    const rs = await ProjectService.get(params._id)
    return rs
  }

  @POST('/Project')
  @INJECT(suAuthoriz())
  @BODYPARSER()
  @RESTRICT({
    body: {
      name: String,
      des: String,
      status: Number,
      plugins: Object
    }
  })
  static async add({ body }) {
    const rs = await ProjectService.insert(body)
    return rs
  }

  @PUT('/Project/:_id')
  @INJECT(suAuthoriz())
  @BODYPARSER()
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    },
    body: {
      name: String,
      des: String,
      status: Number,
      plugins: Object
    }
  })
  static async update({ params, body }) {
    body._id = params._id
    await ProjectService.update(body)
  }

  @DELETE('/Project/:_id')
  @INJECT(suAuthoriz())
  @RESTRICT({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params }) {
    await ProjectService.delete(params._id)
  }

  /////////////////////////////////////////////////////////////

  @GET('/Project')
  @INJECT(authoriz(`${AppConfig.path}/Project`, 'GET'))
  static async getMyProject({ state }) {
    const prj = await ProjectService.get(state.auth.projectId, {
      status: 0, owner: 0
    })
    return prj
  }

  @PUT('/Project')
  @INJECT(authoriz(`${AppConfig.path}/Project`, 'UPDATE_MINE'))
  @BODYPARSER()
  @RESTRICT({
    body: {
      des: String,
      plugins: Object
    }
  })
  static async updateMine({ state, body }) {
    body._id = state.auth.projectId
    await ProjectService.update(body)
  }

}
