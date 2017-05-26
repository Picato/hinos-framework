import * as path from 'path';
import { Server } from 'hinos';
import { route } from 'hinos-route';
import { Mongo } from 'hinos-mongo';
import { serve } from 'hinos-serve';
import { cors } from 'hinos-cors';
import './config';

require(`./env.${Server.env}`).default(Server);

Mongo(AppConfig.mongo);
Server.use(serve({
    '/images': path.join(__dirname, '..', 'assets', 'images')
}));
Server.use(cors());
Server.use(route(path.join(__dirname, 'controller')));

Server.listen(AppConfig.port, () => {
    console.log('Listening port %d', AppConfig.port);
});