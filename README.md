# hinos-log-service
Service help manage logs

# APIs

```js
{
  des: 'Add log',
  method: 'POST',
  url: 'http://localhost:1004/Log',
  requestHeader: {
    'content-type': 'application/json',
    token: '${Token}'
  },
  requestBody: {
    type: 0, // type: Number. Requried
    title: 'Error something', // title: String. Required
    status:  1, // status: Number. Required
    customize: 'thanh', // customize fields add here
    event_type: 'active_account', // customize fields add here
    error: 'got something error' // customize fields add here
  }
}
```

```js
{
  des: 'Update log',
  method: 'PUT',
  url: 'http://localhost:1004/Log/595a03396a7f9504609c11ae',
  requestHeader: {
    'content-type': 'application/json',
    token: '${Token}'
  },
  requestBody: {
    status: 0 // Just allow update status and customize fields
  }
}
```

```js
{
  des: 'Get list logs',
  method: 'GET',
  url: 'http://localhost:1001/Log',
  requestHeader: {
    token: '${Token}'
  }
}
```

```js
{
  des: 'Get log detail',
  method: 'GET',
  url: 'http://localhost:1001/Log/${LogId}',
  requestHeader: {
    token: '${Token}'
  }
}
```

```js
{
  des: 'Delete log',
  method: 'DELETE',
  url: 'http://localhost:1001/Log/${LogId}'
  requestHeader: {
    token: '${Token}'
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
