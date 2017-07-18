# hinos-api-gateway
Manage all of APIs

# Configuration

Config gateway IP in the package.json file

```js
    "url": "http://localhost:8888",
    "gateway": {
        "oauth": "http://localhost:1001",
        "files": "http://localhost:1002",
        "mail": "http://localhost:1003",
        "log": "http://localhost:1004"
    }
```

Note: key in gate must be same root path service
Example: 
-  Link oauth service is 'http://localhost:1001/oauth/Account' then key must be __oauth__
-  Link mail service is 'http://localhost:1003/mail then key must be __mail__

# Prerequisite
If you nodejs verision < 8.0 then you need add bellow code in package.json
```json
"scripts": {
    "start": "node --harmony-async-await .",
}
```
In that: 
* --harmony-async-await is flag which allow nodejs support async await
