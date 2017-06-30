import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { Project, ProjectService } from '../service/ProjectService'
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
    const rs: Project[] = await ProjectService.find({
      $where: where,
      $page: +query.page,
      $recordsPerPage: +query.recordsPerPage
    })
    return rs
  }

  @GET('/Project/:_id')
  @INJECT(suAuthoriz())
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async get({ params }) {
    const rs: Project = await ProjectService.get(params._id)
    return rs
  }

  @POST('/Project')
  @INJECT(suAuthoriz())
  @BODYPARSER()
  @MATCHER({
    body: {
      name: String,
      des: String,
      status: Number,
      plugins: Object
    }
  })
  static async add({ body }) {
    const rs: Project = await ProjectService.insert(body)
    return rs
  }

  @PUT('/Project/:_id')
  @INJECT(suAuthoriz())
  @BODYPARSER()
  @MATCHER({
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
  @MATCHER({
    params: {
      _id: Mongo.uuid
    }
  })
  static async del({ params }) {
    await ProjectService.delete(params._id)
  }

  /////////////////////////////////////////////////////////////

  @GET('/Project')
  @INJECT(authoriz(`${AppConfig.name}>Project`, ['FIND']))
  static async getMyProject({ state }) {
    const prj = await ProjectService.get(state.auth.projectId)
    return prj
  }

}
