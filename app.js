const logger = require('./plugins/utilities/logger');
const fileIO = require('./plugins/utilities/fileIO');
const math = require('./plugins/utilities/math');
const utility = require('./plugins/utilities/utility');
const response = require('./plugins/utilities/response');
const qs = require("qs");

const databaseCore = require('./source/database');
const database = new databaseCore.Database();
database.loadDatabase();

const accountHandler = require(`./plugins/controllers/handlers/account`);
const account = new accountHandler.Account();
const { certificate } = require('./source/certificategenerator');
const cert = certificate.generate("127.0.0.1");

/**
 * Fastify instance
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

//app.register(require('./plugins/register'));
/**
   * Adds compression utils to the Fastify reply object 
   * and a hook to decompress requests payloads. 
   * Supports gzip, deflate, and brotli.
   * @see https://github.com/fastify/fastify-compress
   */
app.register(require('@fastify/compress'),
    {
        encodings: ['deflate'],
        requestEncodings: ['gzip'],
        removeContentLengthHeader: false,
        global: true,
        threshold: 0,
    });
app.log.info("@fastify/compress is enabled");


/**
* Maybe I will need it in the future
* Plugin for serving static files as fast as possible.
* @see https://github.com/fastify/fastify-static

app.register(require("@fastify/static"))
app.log.info("@fastify/static is enabled");
*/


/**
* A plugin for Fastify that adds support 
* for reading and setting cookies.
* @see https://github.com/fastify/fastify-cookie
*/
app.register(require("@fastify/cookie"), {
    secret: 'urmomisawesome',
    parseOptions: {}
})
app.log.info('@fastify/cookie is enabled')

/**
* A simple plugin for Fastify that adds a content type parser 
* for the content type application/x-www-form-urlencoded.
* @see https://github.com/fastify/fastify-formbody
*/
app.register(require('@fastify/formbody'), { parser: str => qs.parse(str) })
app.log.info('@fastify/formbody is enabled')

/**
* Register Handler
*/
app.register(require('./plugins/handler.js'))
app.log.info('Handler registered');



app.addContentTypeParser('*', function (request, payload, done) {
    var data = ''
    payload.on('data', chunk => { data += chunk })
    payload.on('end', () => {
        done(null, data)
    })
})



/**
* Start the server
*/
async function start() {
    try {
        await app.listen({ port: 443, host: '127.0.0.1' });
        app.log.info(`Server listening on ${app.server.address().port}`);
    } catch (err) {
        app.log.info(err);
        process.exit(1);
    }
}
start();