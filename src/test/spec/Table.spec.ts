describe('Test Table API', function() {
  let _id: string

  it('Add new Table', async function() {
    const resp: any = await Axios.post(`${AppConfig.url}/Table`, {
      data: {
        _id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        name: string,
        created_at: Date,
        updated_at: Date
      },
    })
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string')
    _id = resp.body._id
  })

  it('Get list Table', async function() {
    const resp = await Axios.get(`${AppConfig.url}/Table`)
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0)
  })

  it('Get Table detail', async function() {
    const resp = await Axios.get(`${AppConfig.url}/Table/${_id}`)
    expect(resp).http(200).to.have.deep.property('body._id', _id)
  })

  it('Update Table', async function() {
    const resp = await Axios.put(`${AppConfig.url}/Table/${_id}`, {
      data: {
        _id: Uuid,
        project_id: Uuid,
        account_id: Uuid,
        name: string,
        created_at: Date,
        updated_at: Date
      },
    })
    expect(resp).http(204)
  })

  it('Delete Table', async function() {
    const resp = await Axios.delete(`${AppConfig.url}/Table/${_id}`)
    expect(resp).http(204)
  })

})
