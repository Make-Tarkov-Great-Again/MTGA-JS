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
 * @see https://github.com/fastify/fastify-websocket
 * Cannot get this working because I'm not sure how to get the server to accept
 
app.register(require('@fastify/websocket'))
app.register(async function (app) {
    app.get('/websocket', { websocket: true }, (
        connection, // SocketStream
        request // FastifyRequest
    ) => {
        connection.socket.on('message', message => {
            // message.toString() === 'hi from client'
            connection.socket.send('hi from server')
        })
    })
})
*/

/**
 * Register Plugins
 */
app.register(require('./plugins/register.js'));

/**
 * Register Routers
 * I can't seem to get this to run out of `register.js`
 */
app.register(require('./plugins/router.js'))


/**
 * Start the server
 */
const start = async () => {
    try {
        await app.listen(3000, '127.0.0.1');
    } catch (err) {
        app.log(err);
        process.exit(1);
    }
}
start();