import * as path from 'path';
import { Server } from 'hinos';
import { route } from 'hinos-route';
import { Mongo } from 'hinos-mongo';
import { serve } from 'hinos-serve';
import './config';

require(`./env.${Server.env}`).default(Server);

Mongo({
    url: 'mongodb://localhost:27017/validiumv2'
});

Server.use(serve({
    '/images': path.join(__dirname, '..', 'assets', 'images')
}));

Server.use(route(path.join(__dirname, 'controller')));

Server.listen(1338, () => {
    console.log('Started');
});


