const cert = require('./source/certificategenerator');




/**
 * Fastify
 */
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

/**
 * Globals I guess????
 */
global.AE = { util: {} };

/**
 * Register Database
 */
const database = require(`./source/database`);
database.loadDatabase();
global.AE.database = database;



/**
 * Register Route Handler
 */
app.register(require('./plugins/routes/core'));


/**
 * WebSocket support for Fastify. Built upon ws@8.
 * https://github.com/fastify/fastify-websocket
 */
app.register(require('@fastify/websocket'));
app.register(async function (app) {
    app.get('*', { websocket: true }, (connection, request) => {
        connection.socket.on('message', message => {
            connection.socket.send(' websocket is working i guess ');
        });
    });
});

/**
 * Adds compression utils to the Fastify reply object and 
 * a hook to decompress requests payloads.
 * Supports gzip, deflate, and brotli.
 * https://github.com/fastify/fastify-compress
 */
app.register(require
    ('@fastify/compress'),
    {
        encodings: ['deflate', 'gzip'],
        global: true
    }
);

/**
 * A plugin for Fastify that adds support 
 * for reading and setting cookies.
 * https://github.com/fastify/fastify-cookie
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
 * https://github.com/fastify/fastify-url-data
 */
app.register(require('@fastify/url-data'));

/* if (app.path.indexOf('/')) {
    app.all('/', function (request, reply) {
        let config = JSON.parse(serverConfig);
        reply.send({ config });
    });
} */

/**
 * Start the server
 * @param {*} app 
 */
const startServerInstance = async (app) => {
    try {
        await app.listen(3000);
    } catch (err) {
        console.log(err);
    }
}

startServerInstance(app);

/* app.listen(3000, function (err, address) {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info(`Listening on ${address}`);
}); */