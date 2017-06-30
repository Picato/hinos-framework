describe('Test Project API', function() {
  let _id: string;

  it('Add new Project', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Project`, {
      data: {
        _id: Uuid,
        name: string,
        des?: string,
        status: number,
        plugins: object,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Project', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Project`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Project detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Project/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Project', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Project/${_id}`, {
      data: {
        _id: Uuid,
        name: string,
        des?: string,
        status: number,
        plugins: object,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Project', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Project/${_id}`, {});
    expect(resp).http(204);
  });

});