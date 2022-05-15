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
 * Register Plugins
 */
app.register(require('./plugins/register.js'));

/**
 * Start the server
 */
const start = async () => {
    try {
        await app.listen(3000);
    } catch (err) {
        console.log(err);
        //process.exit(1);
    }
}
start();