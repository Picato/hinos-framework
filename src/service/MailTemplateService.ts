import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'

/************************************************
 ** MailTemplateService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('MailTemplate')
/* tslint:disable */
export class MailTemplate {
	_id?: Uuid
	name?: string
	subject?: string
	text?: string
	html?: string
	from?: string
	config_id?: Uuid
	project_id?: Uuid
	account_id?: Uuid
	created_at?: Date
	updated_at?: Date
}
/* tslint:enable */

export class MailTemplateService {
	@MONGO()
	private static mongo: Mongo

	static async find(fil = {}) {
		const rs = await MailTemplateService.mongo.find<MailTemplate>(MailTemplate, fil)
		return rs
	}

	static async get(_id: any) {
		const rs = await MailTemplateService.mongo.get<MailTemplate>(MailTemplate, _id)
		return rs
	}

	@VALIDATE((body: MailTemplate) => {
		body._id = Mongo.uuid() as Uuid
		Checker.required(body, 'name', String)
		Checker.required(body, 'subject', String)
		Checker.required(body, 'from', String)
		if(!/^[_-\w]+$/.test(body.from)) throw HttpError.BAD_REQUEST('from must be alphabet, digit, _ or -')
		Checker.option(body, 'text', String, undefined, () => {
			if (!body.text) Checker.required(body, 'html', String)
		})
		Checker.required(body, 'config_id', Uuid)
		Checker.required(body, 'project_id', Uuid)
		Checker.required(body, 'account_id', Uuid)
		body.created_at = new Date()
		body.updated_at = new Date()
	})
	static async insert(body: MailTemplate) {
		const rs = await MailTemplateService.mongo.insert<MailTemplate>(MailTemplate, body)
		return rs
	}

	@VALIDATE(async (body: MailTemplate) => {
		Checker.required(body, '_id', Object)
		Checker.option(body, 'name', String)
		await Checker.option(body, 'from', String, undefined, () => {
			if(!/^[_-\w]+$/.test(body.from)) throw HttpError.BAD_REQUEST('from must be alphabet, digit, _ or -')
		})		
		Checker.option(body, 'subject', String)
		Checker.option(body, 'text', String, undefined, () => {
			if (!body.text) Checker.required(body, 'html', String)
		})
		Checker.option(body, 'config_id', Uuid)
		Checker.required(body, 'account_id', Uuid)
		if (!body.html) body.html = undefined
		if (!body.text) body.text = undefined
		body.updated_at = new Date()
	})
	static async update(body: MailTemplate) {
		const rs = await MailTemplateService.mongo.update(MailTemplate, body)
		if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
	}

	@VALIDATE((_id: Object) => {
		Checker.required(_id, [, '_id'], Object)
	})
	static async delete(_id: Uuid) {
		const rs = await MailTemplateService.mongo.delete(MailTemplate, _id)
		if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
	}
}
