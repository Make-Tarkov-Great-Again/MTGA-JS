const { certificate } = require("./engine/certificategenerator");
const WebSocket = require("ws");
const zlib = require("node:zlib");
const crypto = require("crypto")
const open = require("open");

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
if (process.platform === 'win32' || process.platform === 'win64') {
    const fs = require('fs');
    const powerShellPath = `${__dirname}/scripts/install-certificate.ps1`
    const powerShellScript = fs.readFileSync(powerShellPath);
    let spawn = require('child_process').spawn;
    let powerShell = spawn('powershell', [powerShellScript]);
    
    let userCancelOrError = false;

    // Redirect stdout and stderr to our script output.
    let scriptOutput = "";
    powerShell.stdout.setEncoding('utf8');
    powerShell.stdout.on('data', function (data) {
        data = data.toString();
        scriptOutput += data;
    });

    powerShell.stderr.setEncoding('utf8');
    powerShell.stderr.on('data', function (data) {
        data = data.toString();
        scriptOutput += data;
        userCancelOrError = true;
    });

    powerShell.on('close', function (_code) {
        if(userCancelOrError) {
            logger.logError(`Unable to install the certificate. Error occured or user canceled the installation.`)
            logger.logError(`The certificate is required for Websockets to work, otherwise the tarkov client will not connect to the socket endpoint.`)
            logger.logError(`If you have any security concerns, you can take a look at the script ${powerShellPath}. The certificate lifetime is 3 days.`)
            logger.logError(`The certificate is generated on first start and will be saved to /user/certs/.`)
            logger.logDebug(scriptOutput);
        } else {
            //open(`https://${database.core.serverConfig.ip}:${database.core.serverConfig.port}`) Opens the weblauncher automatically if wanted.
        }
    });
}

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
