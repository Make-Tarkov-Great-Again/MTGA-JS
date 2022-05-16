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

/* Globals */
app.log.info('Loading global.AE object variables');
global.AE = {
    Fastify: app,
    database: {},
    fileIO: require('./plugins/utilities/fileIO'),
    response: require('./plugins/utilities/response'),
    mods: {
        toLoad: {},
        config: {},
    },
};

/* Register Database */
const database = require(`./source/database`);
database.loadDatabase();

global.AE.database = {
    fleaOfferTemplate: database.core.fleaOfferTemplate,
    hideout: database.hideout,
    items: database.items,
    locales: database.locales,
    templates: database.templates,
    traders: database.traders,
    weather: database.weather,
    profiles: database.profiles,
}
global.AE.bots = {
    botCore: database.core.botCore,
    botTemplate: database.core.botTemplate,
    //botNames: database.botNames,
    //bots: database.bots,
}
global.AE.serverConfig = database.core.serverConfig;
global.AE.globals = database.core.globals;
global.AE.matchMetrics = database.core.matchMetrics;

//global.AE.fileIO = require('./plugins/utilities/fileIO');
//global.AE.response = require('./plugins/utilities/response');


app.log.info('Loaded global.AE object variables');

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