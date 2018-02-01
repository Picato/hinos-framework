# hinos-mail-service
A micro service manage the mail sending and their status

# Features
1. Send email
2. Manage their status
3. Try to resend (3 times) when got error
4. Catch exception into log

# APIs

```js
{
    des: 'Send email',
    method: 'POST',
    url: 'http://localhost:6113/Mail/Send/${MailConfigId}',
    requestHeader: {
        'content-type': 'application/json',
        token: '${Token}'
      },
      requestBody: {
            subject: 'Test 123',
            text: 'something here', // Just only html or text
            html: '<a href="#">Text</a>', // Just only html or text
            from: 'clipvnet@gmail.com',
            to: ['thanhdt@viosoft.com'],
            cc: ['doanthuanthanh88@gmail.com'],
            attachments: [{
                filename: 'filename.txt',
                content: 'data here', // Just only content or path
                path: 'http://file.txt' // Just only content or path
            }]
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
