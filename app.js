const { certificate } = require("./engine/certificategenerator");
const WebSocket = require("ws");
const zlib = require("node:zlib");
const crypto = require("crypto")

/**
 * Fastify instance
 */

const database = require('./engine/database');
const webinterface = require("./engine/webinterface");

module.exports = {
    database
};

const { DatabaseLoader } = require("./engine/databaseLoader");
const { logger } = require("./plugins/utilities");
DatabaseLoader.loadDatabase();

const cert = certificate.generate(database.core.serverConfig.ip, database.core.serverConfig.hostname);

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
    //http2: true,
    https: {
        allowHTTP1: true,
        key: cert.key,
        cert: cert.cert
    }
});

module.exports = {
    app,
    database,
    webinterface
};

app.removeContentTypeParser("application/json");
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    if (req.headers['user-agent'].includes('Unity')) {
        try {
            zlib.inflate(body, function (err, data) {
                if (!err && data !== undefined) {
                    const inflatedString = data.toString('utf-8');
                    if (inflatedString.length > 0) {
                        const json = JSON.parse(inflatedString);
                        done(null, json);
                        return;
                    }
                    done(null, false);
                    return;
                } else {
                    done(null, false);
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
            const json = JSON.parse(body);
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

app.server.on("upgrade", function (request, socket, head) {
    logger.logInfo("upgrade")
})

app.server.on("error", function (error) {
    logger.logError(error)
})

app.register(require('./plugins/register.js'));                                              
app.listen({ port: database.core.serverConfig.port, host: database.core.serverConfig.ip });
logger.logConsole(`

█▀▄▀█    ▄▄▄▄▀   ▄▀  ██   
█ █ █ ▀▀▀ █    ▄▀    █ █  
█ ▄ █     █    █ ▀▄  █▄▄█ 
█   █    █     █   █ █  █ 
   █    ▀       ███     █ 
  ▀                    █  
                      ▀`)
logger.logConsole(` Make Tarkov Great Again
`)