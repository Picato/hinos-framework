describe('Test Service API', function() {
  let _id: string;

  it('Add new Service', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Service`, {
      data: {
        _id: Uuid,
        name: string,
        link: string,
        status: number,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Service', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Service`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Service detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Service/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Service', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Service/${_id}`, {
      data: {
        _id: Uuid,
        name: string,
        link: string,
        status: number,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Service', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Service/${_id}`, {});
    expect(resp).http(204);
  });

});