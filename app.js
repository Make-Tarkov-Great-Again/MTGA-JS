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
        level: 'info',
        serializers: {
            res(res) {
                // the default
                return {
                    statusCode: res.statusCode
                }
            },
            req(req) {
                return {
                    method: req.method,
                    url: req.url,
                    path: req.path,
                    // parameters: req.parameters,
                    // Including the body and headers in the log could be in violation 
                    // of privacy laws, e.g. GDPR. You should use the "redact" option to
                    // remove sensitive fields. It could also leak authentication data in
                    // the logs.
                    body: req.body,
                    headers: req.headers
                }
            }
        }
    },
    http2: true,
    https: {
        allowHTTP1: true,
        key: cert.key,
        cert: cert.cert
    },
    bodyLimit: 52428800,
    exposeHeadRoutes: true,

})
app.addContentTypeParser('*', function (request, payload, done) {
    var data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
      done(null, data)
    })
  })

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

app.register(require('./plugins/register'));
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