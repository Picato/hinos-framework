import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'>>>file
import Utils from '../common/Utils'<<<file

/************************************************
 ** ${Tbl}Service || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('${tbl}')
export class ${Tbl} {
	${$bean}
}

class ${Tbl}ServiceImpl {
	@MONGO()
	private mongo: Mongo>>>file
  
	readonly IMAGE_SIZES: Array<ImageResize> = ${file-resize} <<<file

	async find(fil: any = {}): Promise < Array < ${Tbl} >> {
		const rs: ${Tbl}[] = await this.mongo.find < ${Tbl} > (${Tbl}, fil)
		return rs
	}

	async get(_id: any): Promise < ${Tbl} > {
		const rs: ${Tbl} = await this.mongo.get < ${Tbl} > (${Tbl}, _id)
		return rs
	}

	@VALIDATE((body: ${Tbl}) => {
		${$validateIn}
	})
	async insert(body: ${Tbl}, validate ? : Function): Promise < ${Tbl} > { >>>file
		try {
			const rs: ${Tbl} = await this.mongo.insert < ${Tbl} > (${Tbl}, body)
			// Move file to prod folder
			return rs
		} catch (e) {
			Utils.deleteUploadFiles(body.${file-field}, this.IMAGE_SIZES)
			throw e
		} <<<file >>>normal
        const rs:${Tbl} = await this.mongo.insert<${Tbl}>(${Tbl}, body)        
        return rs<<<normal
	}

	@VALIDATE((body: ${Tbl}) => {
		${$validateUp}
	})
	async update(body: ${Tbl}, validate ? : Function) { >>>file        
		const oldItem: ${Tbl} = await this.mongo.get < ${Tbl} > (${Tbl}, body._id)
		if (!oldItem) throw HttpError.NOT_FOUND('Could not found item to update')
		const rs: number = < number > await this.mongo.update < ${Tbl} > (${Tbl}, body)
		Utils.deleteUploadFiles(oldItem.${file-field}, this.IMAGE_SIZES) 
		// Move file to prod folder <<<file >>>normal
        const rs:number = <number>await this.mongo.update<${Tbl}>(${Tbl}, body)
        if(rs === 0) throw HttpError.NOT_FOUND('Could not found item to update') <<<normal
	}

	@VALIDATE((_id: Uuid) => {
		Checker.must('_id', _id, Uuid)
	})
	async delete(_id: Uuid) { >>>file        
		const item: ${Tbl} = < ${Tbl} > await this.mongo.delete < ${Tbl} > (${Tbl}, _id, {
			return: true
		})
		if (!item) throw HttpError.NOT_FOUND('Could not found item to delete')
		Utils.deleteUploadFiles(item.${file-field}, this.IMAGE_SIZES) <<<file >>>normal
        const rs:number = <number>await this.mongo.delete<${Tbl}>(${Tbl}, _id)
        if(rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete') <<<normal        
	}
}

export const ${Tbl}Service = new ${Tbl}ServiceImpl()
