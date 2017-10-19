import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'>>>normal
import { BODYPARSER } from 'hinos-bodyparser'<<<normal >>>file
import { FILEPARSER } from 'hinos-bodyparser/file'<<<file
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { ${Tbl}Service } from '../service/${Tbl}Service'>>>auth
import { authoriz } from '../service/Authoriz'<<<auth

/************************************************
 ** ${Tbl}Controller || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ${Tbl}Controller {

	@GET('/${tbl}') >>>auth
	@INJECT(authoriz(`${AppConfig.path}/${tbl}`, ['FIND'])) <<<auth
	@RESTRICT({
    query: {
      page: Number,
      recordsPerPage: Number
    }
  })
	static async find({ query }) {
		let where = {}
		const rs = await ${Tbl}Service.find({
			$where: where,
			$page: query.page,
			$recordsPerPage: query.recordsPerPage
		})
		return rs
	}

	@GET('/${tbl}/:_id') >>>auth
	@INJECT(authoriz(`${AppConfig.path}/${tbl}`, ['GET']))<<<auth
	@RESTRICT({
		params: {
			_id: Mongo.uuid
		}
	})
	static async get({ params }) {
		const rs = await ${Tbl}Service.get(params._id)
		return rs
	}

	@POST('/${tbl}')>>>auth
	@INJECT(authoriz(`${AppConfig.path}/${tbl}`, ['INSERT']))<<<auth >>>normal
	@BODYPARSER()<<<normal >>>file
	@FILEPARSER(${file-opts})<<<file
	@RESTRICT({
		body: {
			${$bodyIn}
		}
	})
	static async add({ body }) {
		const rs = await ${Tbl}Service.insert(body)
		return rs
	}

	@PUT('/${tbl}/:_id')>>>auth
	@INJECT(authoriz(`${AppConfig.path}/${tbl}`, ['UPDATE']))<<<auth >>>normal
	@BODYPARSER()<<<normal >>>file
	@FILEPARSER(${file-opts})<<<file
	@RESTRICT({
		params: {
			_id: Mongo.uuid
		},
		body: {
			${$bodyUp}
		}
	})
	static async update({ params, body }) {
		body._id = params._id
		await ${Tbl}Service.update(body)
	}

	@DELETE('/${tbl}/:_id') >>>auth
	@INJECT(authoriz(`${AppConfig.path}/${tbl}`, ['DELETE']))<<<auth
	@RESTRICT({
		params: {
			_id: Mongo.uuid
		}
	})
	static async del({ params }) {
		await ${Tbl}Service.delete(params._id)
	}
	
}
