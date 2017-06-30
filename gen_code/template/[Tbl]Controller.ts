import { GET, POST, PUT, DELETE, HEAD, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { MATCHER } from 'hinos-requestmatcher'
import { Mongo } from 'hinos-mongo'
import { ${Tbl}, ${Tbl}Service } from '../service/${Tbl}Service'>>>auth
import { authoriz } from '../service/Authoriz'<<<auth

/************************************************
 ** ${Tbl}Controller || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class ${Tbl}Controller {

	@GET('/${tbl}') >>>auth
	@INJECT(authoriz(`${AppConfig.name}>${tbl}`, ['FIND'])) <<<auth
	static async find({ query }) {
		let where = {}
		const rs: ${Tbl}[] = await ${Tbl}Service.find({
			$where: where,
			$page: +query.page,
			$recordsPerPage: +query.recordsPerPage
		})
		return rs
	}

	@GET('/${tbl}/:_id') >>>auth
	@INJECT(authoriz(`${AppConfig.name}>${tbl}`, ['GET']))<<<auth
	@MATCHER({
		params: {
			_id: Mongo.uuid
		}
	})
	static async get({ params }) {
		const rs: ${Tbl} = await ${Tbl}Service.get(params._id)
		return rs
	}

	@POST('/${tbl}')>>>auth
	@INJECT(authoriz(`${AppConfig.name}>${tbl}`, ['INSERT']))<<<auth
	@BODYPARSER(>>>file${file-opts}<<<file)
	@MATCHER({
		body: {
			${$bodyIn}
		}
	})
	static async add({ body }) {
		const rs: ${Tbl} = await ${Tbl}Service.insert(body)
		return rs
	}

	@PUT('/${tbl}/:_id')>>>auth
	@INJECT(authoriz(`${AppConfig.name}>${tbl}`, ['UPDATE']))<<<auth
	@BODYPARSER(>>>file${file-opts}<<<file)
	@MATCHER({
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
	@INJECT(authoriz(`${AppConfig.name}>${tbl}`, ['DELETE']))<<<auth
	@MATCHER({
		params: {
			_id: Mongo.uuid
		}
	})
	static async del({ params }) {
		await ${Tbl}Service.delete(params._id)
	}
	
}
