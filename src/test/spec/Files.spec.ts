describe('Test Files API', function() {
  let _id: string;

  it('Add new Files', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Files`, {
      data: {
        _id: Uuid,
        config_id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        links: Array,
        link: string,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Files', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Files`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Files detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Files/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Files', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Files/${_id}`, {
      data: {
        _id: Uuid,
        config_id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        links: Array,
        link: string,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Files', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Files/${_id}`, {});
    expect(resp).http(204);
  });

});