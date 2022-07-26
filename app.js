const { certificate } = require("./engine/certificategenerator");
const cert = certificate.generate("127.0.0.1");
const WebSocket = require("ws");
const zlib = require("node:zlib");
const crypto = require("crypto")

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
                return {
                    statusCode: reply.statusCode
                };
            },
            req(request) {
                return {
                    method: request.method,
                    url: request.url,
                    headers: request.headers,
                    body: request.body
                };
            }
        }
    },
    //http2: true,
    https: {
        allowHTTP1: true,
        key: cert.key,
        cert: cert.cert
    }
});

const database = require('./engine/database');
const webinterface = require("./engine/webinterface");

module.exports = {
    app,
    database,
    webinterface
};

const { DatabaseLoader } = require("./engine/databaseLoader");
const { logger } = require("./plugins/utilities");
DatabaseLoader.loadDatabase();

app.removeContentTypeParser("application/json");
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    if (req.headers['user-agent'].includes('Unity')) {
        try {
            zlib.inflate(body, function (err, data) {
                if (!err && data !== undefined) {
                    var inflatedString = data.toString('utf-8');
                    if (inflatedString.length > 0) {
                        var json = JSON.parse(inflatedString);
                        done(null, json);
                        return;
                    }
                    done(null, body);
                    return;
                } else {
                    done(null, body);
                    return;
                }
            });
        } catch (error) {
            err.statusCode = 400;
            done(err, undefined);
            return;
        }
    } else {
        try {
            var json = JSON.parse(body);
            done(null, json);
        } catch (err) {
            err.statusCode = 400;
            done(err, undefined);
        }
    }
});

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


const websocketServer = new WebSocket.Server({ host: '127.0.0.1', port: 80 });


websocketServer.on('connection', function (ws) {
    logger.logInfo("HELLO BROTHER");

    ws.on("message", function (message) {
        logger.logInfo("you got mail")
        logger.logInfo(message)
    })

    ws.on("upgrade", function(request) {
        logger.logInfo("upgrade")
        logger.logInfo(request)
    })
})

websocketServer.on("headers", function (headers) {
    logger.logInfo(headers)
})

websocketServer.on('listening', ()=>{
    logger.logInfo('listening on 443')
})

websocketServer.on("upgrade", function (request, socket, head) {
    logger.logInfo("upgrade")
    logger.logInfo(request)
    logger.logInfo(socket)
    logger.logInfo(head)
})

websocketServer.on("error", function (error) {
    logger.logError(error)
})

app.server.on("upgrade", function (request, socket, head) {
    logger.logInfo("upgrade")
    logger.logInfo(request)
    logger.logInfo(socket)
    logger.logInfo(head)
})

app.server.on("error", function (error) {
    logger.logError(error)
})

app.register(require('./plugins/register.js'));


app.listen({ port: 443, host: '127.0.0.1' });

