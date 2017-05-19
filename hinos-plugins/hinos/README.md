# hinos
Pure nodejs framework, EXTREME FAST and LIGHT WEIGHT. 
It is optimized for large projects. And of course, it get best performance
"hinos" is not bundled with any middleware. 
It's only nodejs native

## How to use
```nodejs  
npm install hinos --save
```

### Use for Nodejs
```nodejs
const hinosserver = require("hinos");
const Server = hinosserver.Server;

const yourMiddleware = (ctx) => {
    // Return error
    if(ctx.query.isError) throw HttpError.CUSTOMIZE(401, 'Got something error');
    // Return data
    ctx.data = {
        msg: 'Hello world!'
    }
}

Server.use(yourMiddleware);

Server.listen(1337, () => {
    console.log('Started');
});
```
### Use for TypeScript
```nodejs
import { Server, Context, HttpError } from 'hinos';

const yourMiddleware = (ctx: Context) => {
    // Return error
    if(ctx.query.isError) throw HttpError.CUSTOMIZE(401, 'Got something error');
    // Return data
    ctx.data = {
        msg: 'Hello world!'
    }
}

Server.use(yourMiddleware);

Server.listen(1337, () => {
    console.log('Server is listening at port %d', 1337);
});
```
