# hinos-oauth-service
Service help manage authen, authoiz via APIs

# APIs

```js
{
  des: 'Register',
  method: 'POST',
  url: 'http://localhost:1001/Register',
  requestHeader: {
    'content-type': 'application/json', 
    pj: '${ProjectId}',
    role_id: '${RoleId}'
  },
  requestBody: {
      app: 'facebook', // If register via facebook
      token: '${facebook-accessToken}', // If register via facebook
      username: 'thanhdt1',
      password: '123',
      status: 1,
      recover_by: 'doanthuanthanh88@gmail.com',
      more: {} // Customize user information
  }
}
```
```js
{
  des: 'Login',
  method: 'POST',
  url: 'http://localhost:1001/Login',
  requestHeader: {
    'content-type': 'application/json',
    pj: '${ProjectId}',
  },
  requestBody: {
      app: 'facebook', // If register via facebook
      token: '${facebook-accessToken}', // If register via facebook
      username: '${username}',
      password: '${password}'
  }
}
```
```js
{
  des: 'Keep alive session help it not expired',
  method: 'HEAD',
  url: 'http://localhost:1001/Ping',
  requestHeader: {
    token: '${Token}'
  }
}
```
```js
{
  des: 'Logout',
  method: 'GET',
  url: 'http://localhost:1001/Logout',
  requestHeader: {
    token: '${Token}'
  }
}
```
```js
{
  des: 'Check authorization',
  method: 'HEAD',
  url: 'http://localhost:1001/Authoriz?path=test&actions=INSERT',
  requestHeader: {
    'content-type': 'application/json',
    token: '${Token}'
  }
}
```
```js
{
  des: 'Get my information',
  method: 'GET',
  url: 'http://localhost:1001/Me',
  requestHeader: {
    token: '${Token}'
  }
}
```
```js
{
  des: 'Update my information',
  method: 'PUT',
  url: 'http://localhost:1001/Me',
  requestHeader: {
    'content-type': 'application/json', 
    token: '${Token}'
  },
  requestBody: {
      username: 'thanhdt1',
      password: 'password',
      recover_by: 'doanthuanthanh88@gmail.com',
      more: {
        fullname: 'thanh 1'
      }
  }
}
```
```js
{
  des: 'Generate secret key help use api without login',
  method: 'PUT',
  url: 'http://localhost:1001/Secretkey',
  requestHeader: {
    'content-type': 'application/json',
    token: '5954a67b396f111aa86d0da45954a6b0396f111aa86d0da65954acf154320a291040f6c8?2700'
  }
}
```
```js
{
  des: 'get secret key',
  method: 'GET',
  url: 'http://localhost:1001/Secretkey',
  requestHeader: {
    'content-type': 'application/json',
    token: '5954a67b396f111aa86d0da45954a6b0396f111aa86d0da65954acf154320a291040f6c8?2700'
  }
}
```

# Prerequisite
If you nodejs verision < 8.0 then you need add bellow code in package.json
```json
"scripts": {
    "start": "node --harmony-async-await .",
}
```
In that: 
* --harmony-async-await is flag which allow nodejs support async await
