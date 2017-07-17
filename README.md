# hinos-files-service
A micro service manage files uploading and downloading

# About
* When upload a file, it is stored in temp folder
* The files which was stored in temp folder will be deleted after a period of time. So you have 2 choice:
    1.  You need call a API to store them after upload
    2.  Auto store file in the upload process

# Features
1. Upload temp file (It's will be removed after period time)
2. Upload and store file (It's will NOT be removed after period time)
3. Upload images and auto resize it base on file configuration
4. Upload file and auto zip and rename it

# APIs

```js
{
  des: 'Upload and store file ASAP',
  method: 'POST',
  url: 'http://localhost:1002/Files/Upload/${FileConfigId}?store=true',
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
  url: 'http://localhost:1002/Files/Upload/${FileConfigId}',
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
  des: 'Upload and rename file. <<THIS API ONLY BE APPLIED WHEN FILE CONFIG ALLOW AUTO ZIP>>',
  method: 'POST',
  url: 'http://localhost:1002/Files/Upload/${FileConfigId}?name=${fileName}',
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
  url: 'http://localhost:1002/Files/Store',
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
  url: 'http://localhost:1002/Files/Remove',
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
__Global libraries:__ Please ensure installed ```typescript```, ```cross-var```, ```rimraf```
```sh
npm i -g typescript cross-var rimraf
```
__Node version:__ If you nodejs verision < 8.0 then you need add bellow code in package.json
```json
"scripts": {
    "start": "node --harmony-async-await .",
}
```
In that: 
* --harmony-async-await is flag which allow nodejs support async await
