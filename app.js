const databaseCore = require('./source/database');
const database = new databaseCore.Database();
database.loadDatabase();

const accountHandler = require(`./plugins/routes/handlers/account`);
const account = new accountHandler.Account();

const logger = require('./plugins/utilities/logger');
const fileIO = require('./plugins/utilities/fileIO');
const math = require('./plugins/utilities/math');
const utility = require('./plugins/utilities/utility');
const response = require('./plugins/utilities/response');

const { certificate } = require('./source/certificategenerator');
const cert = certificate.generate("127.0.0.1");

const app = require('fastify')({
    logger: {
        prettyPrint: true,
        level: 'info'
    },
    http2: true,
    https: {
        allowHTTP1: true,
        key: cert.key,
        cert: cert.cert
    }
});


module.exports = {
    app,
    database,
    account,
    utility,
    logger,
    fileIO,
    math,
    response,
    mods: {
        toLoad: {},
        config: {},
    },
}

/*  Register Plugins */
app.register(require('./plugins/register'));
app.log.info('Registered plugins');



/**
* Start the server
*/
async function start() {
    try {
        await app.listen(443, '127.0.0.1');
        app.log.info(`Server listening on ${app.server.address().port}`);
    } catch (err) {
        app.log.info(err);
        process.exit(1);
    }
}
start();