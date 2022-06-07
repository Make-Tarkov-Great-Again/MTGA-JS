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
        transport: {
            target: 'pino-pretty'
        },
        serializers: {
            res(reply) {
                // The default
                return {
                    statusCode: reply.statusCode
                }
            },
            req(request) {
                return {
                    method: request.method,
                    url: request.url,
                    headers: request.headers,
                    hostname: request.hostname,
                    remoteAddress: request.ip,
                    remotePort: request.socket.remotePort
                };
            }
        }
    },
    http2: true,
    https: {
        allowHTTP1: true,
        key: cert.key,
        cert: cert.cert
    },

})
app.addHook('preSerialization', async (_req, res, payload) => {
    Object.assign(res.raw, { payload });
});
app.addHook('preHandler', function (req, reply, done) {
    if (req.body) {
        req.log.info({ body: req.body }, 'parsed body')
    }
    done()
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