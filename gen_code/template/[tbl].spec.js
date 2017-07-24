describe('Test ${tbl} API', function () {
  let _id:string

  it('Add new ${tbl}', async function() {
    const resp:any = await Http.post(`${AppConfig.url}/${tbl}`, {>>>file
      headers: {
        'content-type': 'multipart/form-data'
      }, <<<file >>>field
      field: {
        ${fields}
      }, <<<field >>>data
      data: {
        ${fields}
      }, <<<data >>>file
      attach: {
        ${files}  
      } <<<file
    })
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string')
    _id = resp.body._id
  })

  it('Get list ${tbl}', async function () {
    const resp = await Http.get(`${AppConfig.url}/${tbl}`, {})
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0)
  })

  it('Get ${tbl} detail', async function () {
    const resp = await Http.get(`${AppConfig.url}/${tbl}/${_id}`, {})
    expect(resp).http(200).to.have.deep.property('body._id', _id)
  })

  it('Update ${tbl}', async function () {
    const resp = await Http.put(`${AppConfig.url}/${tbl}/${_id}`, { >>>file
      headers: {
        'content-type': 'multipart/form-data'
      }, <<<file >>>field
      field: {
        ${fields}
      }, <<<field >>>data
      data: {
        ${fields}
      }, <<<data >>>file
      attach: {
        ${files}  
      } <<<file
    })
    expect(resp).http(204)
  })

  it('Delete ${tbl}', async function () {
    const resp = await Http.delete(`${AppConfig.url}/${tbl}/${_id}`, {})
    expect(resp).http(204)
  })

})
