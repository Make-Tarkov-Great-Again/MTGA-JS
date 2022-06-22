const { certificate } = require("./engine/certificategenerator");
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
                    params: request.params,
                    body: request.body,
                    query: request.query,
                    hostname: request.hostname,
                    remoteAddress: request.ip,
                    remotePort: request.socket.remotePort,
                    routerMethod: request.routerMethod,
                    routerPath: request.routerPath
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

const database = require('./engine/database');
database.loadDatabase();
const webinterface = require("./engine/webinterface");

module.exports = {
    app,
    database,
    webinterface
}

app.removeAllContentTypeParsers();
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    try {
        var json = JSON.parse(body)
        done(null, json)
    } catch (err) {
        err.statusCode = 400
        done(err, undefined)
    }
})

app.addContentTypeParser('*', (req, payload, done) => {
    const chunks = [];
    payload.on('data', chunk => {
        chunks.push(chunk);
    });
    payload.on('end', () => {
        done(null, Buffer.concat(chunks));
    });
});

/**
* Register Handler
*/
app.register(require('./plugins/register.js'))
app.log.info('Register registered');



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