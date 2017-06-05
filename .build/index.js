"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const hinos_1 = require("hinos");
const hinos_route_1 = require("hinos-route");
const hinos_mongo_1 = require("hinos-mongo");
const hinos_serve_1 = require("hinos-serve");
const hinos_cors_1 = require("hinos-cors");
const autoclick_1 = require("./autoclick");
require("./config");
require(`./env.${hinos_1.Server.env}`).default(hinos_1.Server);
hinos_mongo_1.Mongo(AppConfig.mongo);
hinos_1.Server.use(hinos_serve_1.serve({
    '/images': path.join(__dirname, '..', 'assets', 'images')
}));
hinos_1.Server.use(hinos_cors_1.cors());
hinos_1.Server.use(hinos_route_1.route(path.join(__dirname, 'controller')));
hinos_1.Server.listen(AppConfig.port, async () => {
    console.info(`
       _     _                 
      | |__ (_)_ __   ___  ___  ${AppConfig.port} 
      | '_ \\| | '_ \\ / _ \\/ __|
      | | | | | | | | (_) \\__ \\
      |_| |_|_|_| |_|\\___/|___/      
    `);
    setTimeout(autoclick_1.scan, 5000);
});
//# sourceMappingURL=index.js.map