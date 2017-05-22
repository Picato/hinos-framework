describe('Test chart API', function() {
	let _id: string;

	it('Add new chart', async function() {
		const resp: any = await Http.post(`${AppConfig.url}/chart`, {
			data: {
				_id: Uuid,
				project_id: Uuid,
				account_id: Uuid,
				page_id: Uuid,
				oder ? : number,
				options: object,
				created_at ? : Date,
				updated_at ? : Date
			},
		});
		expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
		_id = resp.body._id;
	});

	it('Get list chart', async function() {
		const resp: any = await Http.get(`${AppConfig.url}/chart`, {});
		expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
	});

	it('Get chart detail', async function() {
		const resp: any = await Http.get(`${AppConfig.url}/chart/${_id}`, {});
		expect(resp).http(200).to.have.deep.property('body._id', _id);
	});

	it('Update chart', async function() {
		const resp: any = await Http.put(`${AppConfig.url}/chart/${_id}`, {
			data: {
				_id: Uuid,
				project_id: Uuid,
				account_id: Uuid,
				page_id: Uuid,
				oder ? : number,
				options: object,
				created_at ? : Date,
				updated_at ? : Date
			},
		});
		expect(resp).http(204);
	});

	it('Delete chart', async function() {
		const resp: any = await Http.delete(`${AppConfig.url}/chart/${_id}`, {});
		expect(resp).http(204);
	});

});