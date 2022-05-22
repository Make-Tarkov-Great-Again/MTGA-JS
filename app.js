const logger = require('./plugins/utilities/logger');
const fileIO = require('./plugins/utilities/fileIO');
const math = require('./plugins/utilities/math');
const utility = require('./plugins/utilities/utility');
const response = require('./plugins/utilities/response');

const databaseCore = require('./source/database');
const database = new databaseCore.Database();
database.loadDatabase();

const accountHandler = require(`./plugins/controllers/handlers/account`);
const account = new accountHandler.Account();
const { certificate } = require('./source/certificategenerator');
const cert = certificate.generate("127.0.0.1");

/**
 * dsadsad
 */
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


app.addContentTypeParser(
    'application/json',
    {
        parseAs: 'buffer',
        bodyLimit: 52428800,
    },
    function (req, body, done) {
        try {
            if (req.body != null) {
                var json = JSON.parse(body)
                done(null, json)
            } else {
                done(err, null);
            }
        } catch (err) {
            err.statusCode = 400
            done(err, undefined)
        }
    }
);

app.register(function (req, res, next) {
    if (req.method == `POST`) {
        if (req.body.toString && JSON.parse(req.body)) {
            req.body = JSON.parse(req.body);
            app.log.debug(req.body);
            next();
        } else {
            if (req.headers['content-type'] == `deflate`) {
                res
                    .compress(req.body)
            }
            next();
        }
    } 
    next()
});


/*  Register Plugins */
app.register(require('./plugins/register'));
app.log.info('Registered plugins');

module.exports = {
    app,
    database,
    utility,
    logger,
    fileIO,
    math,
    response,
    mods: {
        toLoad: {},
        config: {},
    },
    account,
}
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