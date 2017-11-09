describe('Test Account API', function() {
  let _id: string;

  it('Add new Account', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Account`, {
      data: {
        _id: Uuid,
        username: string,
        password: string,
        project_id: Uuid,
        status: number,
        recover_by: string,
        role_ids?: Array,
        secret_key?: string,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Account', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Account`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Account detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Account/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Account', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Account/${_id}`, {
      data: {
        _id: Uuid,
        username: string,
        password: string,
        project_id: Uuid,
        status: number,
        recover_by: string,
        role_ids?: Array,
        secret_key?: string,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Account', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Account/${_id}`, {});
    expect(resp).http(204);
  });

});