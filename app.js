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
app.log.info('Database loaded');
global.AE.database = database;
app.log.info('...and attached to the AE global object');

/**
* Register Plugins
*/
app.register(require('./plugins/register'));
app.log.info('Registered plugins');



/**
* Start the server
*/
async function start(){
    try {
        await app.listen(3000, '127.0.0.1');
        app.log.info(`Server listening on ${app.server.address().port}`);
    } catch (err) {
        app.log.info(err);
        process.exit(1);
    }
}
start();