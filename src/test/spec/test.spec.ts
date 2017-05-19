describe('Test test API', function() {
	let _id: string;

	it('Add new test', async function() {
		const resp: any = await Http.post(`${AppConfig.url}/test`, {
			headers: {
				'content-type': 'multipart/form-data'
			},
			field: {
				_id: Uuid,
				project_id ? : Uuid,
				name: string,
				age: number,
				shared: boolean,
				arr: Array < {
					name ? : string;
					people ? : Array < {
						name1 ? : string;
						age1 ? : number
					} >
				} > ,
				obj ? : {
					name ? : string;
					age ? : number;
					obj1 ? : {
						b ? : number
					}
				},
				created_at ? : Date,
				updated_at ? : Date
			},
			attach: {
				file ? : string
			}
		});
		expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
		_id = resp.body._id;
	});

	it('Get list test', async function() {
		const resp: any = await Http.get(`${AppConfig.url}/test`, {});
		expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
	});

	it('Get test detail', async function() {
		const resp: any = await Http.get(`${AppConfig.url}/test/${_id}`, {});
		expect(resp).http(200).to.have.deep.property('body._id', _id);
	});

	it('Update test', async function() {
		const resp: any = await Http.put(`${AppConfig.url}/test/${_id}`, {
			headers: {
				'content-type': 'multipart/form-data'
			},
			field: {
				_id: Uuid,
				project_id ? : Uuid,
				name: string,
				age: number,
				shared: boolean,
				arr: Array < {
					name ? : string;
					people ? : Array < {
						name1 ? : string;
						age1 ? : number
					} >
				} > ,
				obj ? : {
					name ? : string;
					age ? : number;
					obj1 ? : {
						b ? : number
					}
				},
				created_at ? : Date,
				updated_at ? : Date
			},
			attach: {
				file ? : string
			}
		});
		expect(resp).http(204);
	});

	it('Delete test', async function() {
		const resp: any = await Http.delete(`${AppConfig.url}/test/${_id}`, {});
		expect(resp).http(204);
	});

});