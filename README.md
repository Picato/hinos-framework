# hinos-files-service
Service help upload and download files

# APIs

```js
{
  des: 'Upload file',
  method: 'POST',
  url: 'http://localhost:1002/Upload/${FileConfigId}',
  requestHeader: {
    'content-type': 'multipart/form-data',
    token: '${Token}'
  },
  requestBody: {   
    'files': ['C:\\test.jpg', 'C:\\test.jpg'] // data here
  }
}
```

```js
{
  des: 'Delete multiple files upload',
  method: 'PUT',
  url: 'http://localhost:1002/Remove',
  requestHeader: {
    'content-type': 'application/json',
    token: '${Token}'
  },
  requestBody: {
    files: [
      'http://urlfilehere',
      'http://urlfilehere'
    ]
  }
}
```

```js
{
  des: 'Delete single file upload',
  method: 'DELETE',
  url: 'http://localhost:1001/Files/${link}',
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
