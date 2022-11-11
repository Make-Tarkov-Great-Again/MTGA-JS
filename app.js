const { certificate } = require("./lib/engine/CertificateGenerator");
const zlib = require("node:zlib");
const opener = require("opener");
const qs = require('fast-querystring');
const { logger, parse } = require("./lib/utilities");
const pngStringify = require('console-png');



/**
 * Fastify instance
 */
const database = require('./lib/engine/Database');
const webinterface = require("./lib/engine/WebInterface");
const tasker = require('./lib/engine/Tasker');
tasker.execute();

module.exports = {
    database, tasker
};


let cert;
const { DatabaseLoader } = require("./lib/engine/DatabaseLoader");

if (process.platform === 'win32' || process.platform === 'win64') {
    const fs = require('fs');
    cert = certificate.generate(database.core.serverConfig.ip, database.core.serverConfig.hostname, 3);

    const clearCertificateScriptPath = `${__dirname}/assets/scripts/clear-certificate.ps1`;
    const execSync = require('child_process').execSync;
    const code = execSync(`powershell.exe -ExecutionPolicy Bypass -File "${clearCertificateScriptPath}"`);

    const installCertificateScriptPath = `${__dirname}/assets/scripts/install-certificate.ps1`;
    const installCertificateScript = fs.readFileSync(installCertificateScriptPath);
    const spawn = require('child_process').spawn;
    const installCertificatePowerShell = spawn('powershell', [installCertificateScript]);

    let userCancelOrError = false;
    // Redirect stdout and stderr to our script output.
    let installCertificateScriptOutput = "";
    installCertificatePowerShell.stdout.setEncoding('utf8');
    installCertificatePowerShell.stdout.on('data', function (data) {
        data = data.toString();
        installCertificateScriptOutput += data;
    });

    installCertificatePowerShell.stderr.setEncoding('utf8');
    installCertificatePowerShell.stderr.on('data', function (data) {

        if (data.includes("Get-ChildItem : Cannot find drive")) {
            logger.error(`
            [installCertificatePowerShell.stderr.on]
            Report error below to our GitHub Issues, or on our Discord Bug reports.
            
            `);
            logger.error(data);
            userCancelOrError = true;
        }

        data = data.toString();
        installCertificateScriptOutput += data;
    });

    installCertificatePowerShell.on('close', function (_code) {
        if (userCancelOrError) {
            logger.error(`
                [HTTPS Certification Installation failed]
                    If an error occured, report on Discord!
                    If you chose not to allow the installation, read below:
                        
                        The certificate is required for Websockets to work, otherwise the Client will not connect to the socket endpoint.
                            If you have any security concerns, you can take a look at the script ${installCertificateScriptPath}.        
                        The certificate is generated on first start, has a lifetime of 3 days, and is saved to /user/certs/.
            
                [Shutting Down, restart the server and accept certificate installation] 
            `);
        }
    });
} else {
    cert = certificate.generate(database.core.serverConfig.ip, database.core.serverConfig.hostname, 365);
}

const app = require('fastify')({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                singleLine: true,
            }
        },
        serializers: {
            req(request) {
                return `[${request.method}] ${request.url}`
            },
            res(reply) {
                return `${reply.statusCode}`
            }
        }
    },
    querystringParser: str => qs.parse(str),
    http2: true,
    https: {
        allowHTTP1: true,
        key: cert.key,
        cert: cert.cert,
        ca: cert.cert,

        requestCert: true,
        rejectUnauthorized: false,
    },
    onProtoPoisoning: "remove",
});

module.exports = {
    app,
    database,
    webinterface,
    tasker
};

app.removeContentTypeParser("application/json");
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    if (req.headers["user-agent"] !== undefined &&
        req.headers['user-agent'].includes(['UnityPlayer' || 'Unity'])) {
        try {
            zlib.inflate(body, { chunkSize: 32768 }, function (err, data) {
                if (!err && data) {
                    const inflatedString = data.toString('utf-8');
                    if (inflatedString.length > 0) {
                        done(null, parse(inflatedString));
                        return;
                    }
                    done(null, false);
                    //return;
                } else {
                    done(null, false);
                    //return;
                }
            });
        } catch (error) {
            err.statusCode = 400;
            done(err, undefined);
            return;
        }
    } else {
        try {
            done(null, parse(body));
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

app.register(require('./lib/plugins/register.js')); //register

const image = require('fs').readFileSync(__dirname + '/assets/templates/webinterface/resources/logo/rs_banner_transparent.png');
pngStringify(image, function (err, string) {
    if (err) throw err;
    logger.success(string);
})

app.listen(
    {
        port: database.core.serverConfig.port,
        host: database.core.serverConfig.ip
    }
)
DatabaseLoader.setDatabase();

/* .then(() => {
    setTimeout(() => app.log.info("Web-based Launcher will open in 3 seconds..."), 750);

    setTimeout(() => {
        opener(`https://${database.core.serverConfig.ip}:${database.core.serverConfig.port}`)
    }, 3000);
}); */

