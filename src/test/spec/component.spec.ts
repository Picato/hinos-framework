describe('Test component API', function() {
  let _id: string;

  it('Add new component', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/component`, {
      data: {
        _id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        file: string,
        group: string,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list component', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/component`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get component detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/component/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update component', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/component/${_id}`, {
      data: {
        _id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        file: string,
        group: string,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete component', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/component/${_id}`, {});
    expect(resp).http(204);
  });

});