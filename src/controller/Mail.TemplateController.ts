import { GET, POST, PUT, DELETE, INJECT } from 'hinos-route'
import { BODYPARSER } from 'hinos-bodyparser'
import { RESTRICT } from 'hinos-bodyparser/restrict'
import { Mongo } from 'hinos-mongo'
import { MailTemplateService } from '../service/MailTemplateService'
import { authoriz } from '../service/Authoriz'

/************************************************
 ** MailTemplateController || 4/10/2017, 10:19:24 AM **
 ************************************************/

export class MailTemplateController {

	@GET('/MailTemplate')
	@INJECT(authoriz(`${AppConfig.path}/MailTemplate`, 'FIND'))
	@RESTRICT({
		query: {
			page: Number,
			recordsPerPage: Number
		}
	})
	static async find({ query }) {
		let where = {}
		const rs = await MailTemplateService.find({
			$where: where,
			$page: query.page,
			$recordsPerPage: query.recordsPerPage,
			$sort: { name: 1 },
			$fields: { text: 0, html: 0, project_id: 0 }
		})
		return rs
	}

	@GET('/MailTemplate/:_id')
	@INJECT(authoriz(`${AppConfig.path}/MailTemplate`, 'GET'))
	@RESTRICT({
		params: {
			_id: Mongo.uuid
		}
	})
	static async get({ params, state }) {
		const rs = await MailTemplateService.get({
			_id: params._id,
			project_id: state.auth.projectId
		})
		return rs
	}

	@POST('/MailTemplate')
	@INJECT(authoriz(`${AppConfig.path}/MailTemplate`, 'INSERT'))
	@BODYPARSER()
	@RESTRICT({
		body: {
			name: String,
			subject: String,
			text: String,
			html: String,
			from: String,
			config_id: Mongo.uuid,
		}
	})
	static async add({ body, state }) {
		body.project_id = state.auth.projectId
		body.account_id = state.auth.accountId
		const rs = await MailTemplateService.insert(body)
		return rs
	}

	@PUT('/MailTemplate/:_id')
	@INJECT(authoriz(`${AppConfig.path}/MailTemplate`, 'UPDATE'))
	@BODYPARSER()
	@RESTRICT({
		params: {
			_id: Mongo.uuid
		},
		body: {
			name: String,
			subject: String,
			text: String,
			html: String,
			from: String,
			config_id: Mongo.uuid
		}
	})
	static async update({ params, body, state }) {
		body._id = {
			_id: params._id,
			project_id: state.auth.projectId
		}
		body.account_id = state.auth.accountId
		await MailTemplateService.update(body)
	}

	@DELETE('/MailTemplate/:_id')
	@INJECT(authoriz(`${AppConfig.path}/MailTemplate`, 'DELETE'))
	@RESTRICT({
		params: {
			_id: Mongo.uuid
		}
	})
	static async del({ params, state }) {
		await MailTemplateService.delete({
			_id: params._id,
			project_id: state.auth.projectId
		})
	}

}
