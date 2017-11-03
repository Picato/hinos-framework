describe('Test MailTemplate API', function () {
  let _id:string

  it('Add new MailTemplate', async function() {
    const resp:any = await Axios.post(`${AppConfig.url}/MailTemplate`, {  
      data: {
        _id: Uuid,
name: string,
subject: string,
text: string,
html: string,
config_id: Uuid,
project_id: Uuid,
account_id: Uuid,
created_at: Date,
updated_at: Date
      },  
    })
    expect(resp).http(200).to.have.deep.property('body._id').and.be.a('string')
    _id = resp.body._id
  })

  it('Get list MailTemplate', async function () {
    const resp = await Axios.get(`${AppConfig.url}/MailTemplate`)
    expect(resp).http(200).to.have.property('body').and.be.an('array').with.length.above(0)
  })

  it('Get MailTemplate detail', async function () {
    const resp = await Axios.get(`${AppConfig.url}/MailTemplate/${_id}`)
    expect(resp).http(200).to.have.deep.property('body._id', _id)
  })

  it('Update MailTemplate', async function () {
    const resp = await Axios.put(`${AppConfig.url}/MailTemplate/${_id}`, {   
      data: {
        _id: Uuid,
name: string,
subject: string,
text: string,
html: string,
config_id: Uuid,
project_id: Uuid,
account_id: Uuid,
created_at: Date,
updated_at: Date
      },  
    })
    expect(resp).http(204)
  })

  it('Delete MailTemplate', async function () {
    const resp = await Axios.delete(`${AppConfig.url}/MailTemplate/${_id}`)
    expect(resp).http(204)
  })

})
