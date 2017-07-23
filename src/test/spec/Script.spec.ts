describe('Test Script API', function() {
  let _id: string;

  it('Add new Script', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Script`, {
      data: {
        _id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        content: string,
        tag: string,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Script', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Script`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Script detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Script/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Script', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Script/${_id}`, {
      data: {
        _id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        content: string,
        tag: string,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Script', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Script/${_id}`, {});
    expect(resp).http(204);
  });

});