describe('Test Role API', function() {
  let _id: string;

  it('Add new Role', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Role`, {
      data: {
        _id: Uuid,
        name: string,
        api: Array,
        web: Array,
        mob: Array,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Role', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Role`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Role detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Role/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Role', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Role/${_id}`, {
      data: {
        _id: Uuid,
        name: string,
        api: Array,
        web: Array,
        mob: Array,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Role', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Role/${_id}`, {});
    expect(resp).http(204);
  });

});