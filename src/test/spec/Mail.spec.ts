describe('Test Mail API', function() {
  let _id: string;

  it('Add new Mail', async function() {
    const resp: any = await Http.post(`${AppConfig.url}/Mail`, {
      data: {
        _id: Uuid,
        config_id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        subject: string,
        text: string,
        html: string,
        from: string,
        to: Array,
        cc: Array,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string');
    _id = resp.body._id;
  });

  it('Get list Mail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Mail`, {});
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0);
  });

  it('Get Mail detail', async function() {
    const resp: any = await Http.get(`${AppConfig.url}/Mail/${_id}`, {});
    expect(resp).http(200).to.have.deep.property('body._id', _id);
  });

  it('Update Mail', async function() {
    const resp: any = await Http.put(`${AppConfig.url}/Mail/${_id}`, {
      data: {
        _id: Uuid,
        config_id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        subject: string,
        text: string,
        html: string,
        from: string,
        to: Array,
        cc: Array,
        created_at?: Date,
        updated_at?: Date
      },
    });
    expect(resp).http(204);
  });

  it('Delete Mail', async function() {
    const resp: any = await Http.delete(`${AppConfig.url}/Mail/${_id}`, {});
    expect(resp).http(204);
  });

});