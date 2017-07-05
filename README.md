# hinos-files-service
Service help upload and download files

# About
* When upload a file, it is stored in temp folder
* The files which was stored in temp folder will be deleted after a period of time. So you have 2 choice:
    1.  You need call a API to store them after upload
    2.  Store file in the upload process

# APIs

```js
{
  des: 'Upload and store file ASAP',
  method: 'POST',
  url: 'http://localhost:1002/Upload/${FileConfigId}?store=true',
  requestHeader: {
    'content-type': 'multipart/form-data',
    token: '${Token}'
  },
  requestBody: {
    'file:files': ['C:\\test.jpg', 'C:\\test.jpg']
  }
}
```
```js
{
  des: 'Just upload without store',
  method: 'POST',
  url: 'http://localhost:1002/Upload/${FileConfigId}',
  requestHeader: {
    'content-type': 'multipart/form-data',
    token: '${Token}'
  },
  requestBody: {
    'files': ['C:\\test.jpg', 'C:\\test.jpg']
  }
}
```
```js
{
  des: 'Store files which were uploaded before that',
  method: 'PUT',
  url: 'http://localhost:1002/Store',
  requestHeader: {
    token: '${Token}'
  },
  requestBody: {   
    'files': [${LinkGetAfterUpload1}, ${LinkGetAfterUpload2}]
  }
}
```
```js
{
  des: 'Remove files on server',
  method: 'PUT',
  url: 'http://localhost:1002/Remove',
  requestHeader: {
    'content-type': 'application/json',
    token: '${Token}'
  },
  requestBody: {
    'files': [${LinkGetAfterUpload1}, ${LinkGetAfterUpload2}]
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
