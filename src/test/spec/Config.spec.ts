describe('Test Config API', function() {
  let _id: string;

  it('Add new Config', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Config`, {
      data: {
        _id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        config: object,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Config', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Config`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Config detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Config/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Config', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Config/${_id}`, {
      data: {
        _id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        config: object,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Config', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Config/${_id}`, {});
    expect(resp).http(204);
  });

});