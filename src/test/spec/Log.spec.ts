describe('Test Log API', function() {
  let _id: string;

  it('Add new Log', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Log`, {
      data: {
        _id: Uuid,
        status: number,
        error: string,
        created_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Log', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Log`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Log detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Log/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Log', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Log/${_id}`, {
      data: {
        _id: Uuid,
        status: number,
        error: string,
        created_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Log', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Log/${_id}`, {});
    expect(resp).http(204);
  });

});