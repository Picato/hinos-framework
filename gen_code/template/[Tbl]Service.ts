import { VALIDATE, Checker } from 'hinos-validation'>>>file
import { ImageResize } from 'hinos-bodyparser/file'<<<file
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'>>>file
import Utils from '../common/Utils'<<<file

/************************************************
 ** ${Tbl}Service || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('${tbl}')
/* tslint:disable */
export class ${Tbl} {
  ${$bean}
}
/* tslint:enable */

export class ${Tbl}Service {>>>file
	static readonly IMAGE_SIZES: ImageResize[] = ${file-resize} 
	<<<file
	@MONGO()
	private static mongo: Mongo

	static async find(fil = {}) {
		const rs = await ${Tbl}Service.mongo.find<${Tbl}> (${Tbl}, fil)
		return rs
	}

	static async get(_id: any) {
		const rs = await ${Tbl}Service.mongo.get<${Tbl}> (${Tbl}, _id)
		return rs
	}

	@VALIDATE((body: ${Tbl}) => {
		${$validateIn}
	})
	static async insert(body: ${Tbl}) { >>>file
		try {
			const rs = await ${Tbl}Service.mongo.insert<${Tbl}> (${Tbl}, body)
			// Move file to prod folder
			return rs
		} catch (e) {
			Utils.deleteUploadFiles(body.${file-field}, this.IMAGE_SIZES)
			throw e
		} <<<file >>>normal
        const rs = await ${Tbl}Service.mongo.insert<${Tbl}>(${Tbl}, body)
        return rs<<<normal
	}

	@VALIDATE((body: ${Tbl}) => {
		${$validateUp}
	})
	static async update(body: ${Tbl}) { >>>file        
		const oldItem = await ${Tbl}Service.mongo.update<${Tbl}> (${Tbl}, body, { return: true })
		if (!oldItem) throw HttpError.NOT_FOUND('Could not found item to update')
		Utils.deleteUploadFiles(oldItem.${file-field}, ${Tbl}Service.IMAGE_SIZES) 
		// Move file to prod folder<<<file>>>normal
		const rs = await ${Tbl}Service.mongo.update(${Tbl}, body)
		if(rs === 0) throw HttpError.NOT_FOUND('Could not found item to update') <<<normal
	}

	@VALIDATE((_id: Uuid) => {
		Checker.required(_id, [, '_id'], Uuid)
	})
	static async delete(_id: Uuid) { >>>file        
		const item = await ${Tbl}Service.mongo.delete<${Tbl}> (${Tbl}, _id, { return: true })
		if (!item) throw HttpError.NOT_FOUND('Could not found item to delete')
		Utils.deleteUploadFiles(item.${file-field}, ${Tbl}Service.IMAGE_SIZES) <<<file >>>normal
		const rs = await ${Tbl}Service.mongo.delete(${Tbl}, _id)
		if(rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete') <<<normal        
	}
}
