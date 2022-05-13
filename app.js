const cert = require('./source/certificategenerator');
const fs = require('fs');
const path = require('path');

/**
 * Convenience plugin for Fastify that loads all plugins found in a 
 * directory and automatically configures routes matching the folder structure.
 */
const autoload = require('@fastify/autoload');  

const app = require('fastify')({
    logger: {
        prettyPrint: true
    },
    http2: true,
    https: {
        allowHTTP1: true,
        key: cert.KEY,
        cert: cert.CERT
    }
});

app.register(require
    ('@fastify/compress'),
    {
        encodings: ['deflate', 'gzip'],
        global: true
    }
);

/**
 * Load all routes found in the routes directory.
 
app.register(autoload, {
    dir: path.join(__dirname, 'source/controllers'),
});
*/


/**
 * A plugin for Fastify that adds support 
 * for reading and setting cookies.
 */
app.register(require
    ('@fastify/cookie'),
    {
        secret: 'urmomisawesome',
        parseOptions: {}
    }
);

/**
 * A plugin for Fastify that adds support 
 * for getting raw URL information from the request.
 */
app.register(require('@fastify/url-data'));


const serverConfig = fs.readFileSync('./database/config/server.json');
const launcherRoute = require('./routes/launcher');




/* if (app.path.indexOf('/')) {
    app.all('/', function (request, reply) {
        let config = JSON.parse(serverConfig);
        reply.send({ config });
    });
} */

const RouteServer = require('./routes/routerhandler');
RouteServer.initializeRouting(app);


app.listen(3000, function (err, address) {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info(`Listening on ${address}`);
});