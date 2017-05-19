import * as _ from 'lodash';
import {
	VALIDATE,
	Checker
} from 'hinos-validation';
import {
	ImageResize
} from 'hinos-bodyparser';
import {
	MONGO,
	Mongo,
	Uuid,
	Collection
} from 'hinos-mongo';
import HttpError from '../common/HttpError';
import Utils from './Utils';

/************************************************
 ** TestService || 4/10/2017, 10:19:24 AM **
 ************************************************/

@Collection('test')
export class Test {
	_id?: Uuid;
	project_id?: Uuid;
	name?: string;
	age?: number;
	shared?: boolean;
	arr?: Array<{
		name?: string;
		people?: Array<{
			name1?: string;
			age1?: number
		}>
	}>;
	obj?: {
		name?: string;
		age?: number;
		obj1?: {
			b?: number
		}
	};
	file?: Array<string>;
	created_at?: Date;
	updated_at?: Date;
}

export class TestService {
	@MONGO()
	static mongo: Mongo;
	static readonly IMAGE_SIZES: Array<ImageResize> = [{
		w: -1000
	}, {
		w: 32,
		h: 32,
		ext: "thumb"
	}, {
		w: 224,
		h: 200,
		ext: "list.pc"
	}, {
		w: 358,
		h: 200,
		ext: "list.tab"
	}, {
		w: 270,
		h: 200,
		ext: "list.mob"
	}];

	static async find(fil: any = {}): Promise<Array<Test>> {
		const rs: Test[] = await TestService.mongo.find<Test>(Test, fil);
		return rs;
	}

	static async get(_id: any): Promise<Test> {
		const rs: Test = await TestService.mongo.get<Test>(Test, _id);
		return rs;
	}

	@VALIDATE((body: Test) => {
		body._id = <Uuid>Mongo.uuid();
		Checker.option('project_id', body.project_id, Uuid);
		Checker.must('name', body.name, String);
		Checker.must('age', body.age, Number);
		Checker.must('shared', body.shared, Boolean);
		Checker.must('arr', body.arr, Array);
		body.arr = body.arr.map((arr, i) => {
			Checker.must('name', arr.name, String);
			Checker.must('people', arr.people, Array);
			arr.people = arr.people.map((people, i) => {
				Checker.must('name1', people.name1, String);
				Checker.must('age1', people.age1, Number);
				return people;
			});
			return arr;
		});
		Checker.option('obj', body.obj, Object, (obj) => {
			Checker.option('name', obj.name, String);
			Checker.must('age', obj.age, Number);
			Checker.must('obj1', obj.obj1, Object, {
				b: 10
			});
			Checker.must('b', obj.obj1.b, Number);
		});
		Checker.option('file', body.file, Array);
		body.created_at = new Date();
		body.updated_at = new Date();
	})
	static async insert(body: Test, validate?: Function): Promise<Test> {
		try {
			const rs: Test = await TestService.mongo.insert<Test>(Test, body);
			// Move file to prod folder
			return rs;
		} catch (e) {
			Utils.deleteUploadFiles(body.file, TestService.IMAGE_SIZES);
			throw e;
		}
	}

	@VALIDATE((body: Test) => {
		Checker.must('_id', body._id, Uuid);
		Checker.option('project_id', body.project_id, Uuid);
		Checker.option('name', body.name, String);
		Checker.option('age', body.age, Number);
		Checker.option('shared', body.shared, Boolean);
		Checker.option('arr', body.arr, Array, (arr) => {
			body.arr = body.arr.map((arr, i) => {
				Checker.option('name', arr.name, String);
				Checker.option('people', arr.people, Array, (people) => {
					arr.people = arr.people.map((people, i) => {
						Checker.option('name1', people.name1, String);
						Checker.option('age1', people.age1, Number);
						return people;
					});
				});
				return arr;
			});
		});
		Checker.option('obj', body.obj, Object, (obj) => {
			Checker.option('name', obj.name, String);
			Checker.option('age', obj.age, Number);
			Checker.option('obj1', obj.obj1, Object, (obj1) => {
				Checker.option('b', obj1.b, Number);
			});
		});
		Checker.option('file', body.file, Array);
		Checker.option('created_at', body.created_at, Date);
		body.updated_at = new Date();
	})
	static async update(body: Test, validate?: Function) {
		const oldItem: Test = await TestService.mongo.get<Test>(Test, body._id);
		if (!oldItem) throw HttpError.NOT_FOUND('Could not found item to update');
		const rs: number = <number>await TestService.mongo.update<Test>(Test, body);
		Utils.deleteUploadFiles(oldItem.file, TestService.IMAGE_SIZES);
		// Move file to prod folder  
	}

	@VALIDATE((_id: Uuid) => {
		Checker.must('_id', _id, Uuid);
	})
	static async delete(_id: Uuid) {
		const item: Test = <Test>await TestService.mongo.delete<Test>(Test, _id, {
			return: true
		});
		if (!item) throw HttpError.NOT_FOUND('Could not found item to delete');
		Utils.deleteUploadFiles(item.file, TestService.IMAGE_SIZES);
	}

}