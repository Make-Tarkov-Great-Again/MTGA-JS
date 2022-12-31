const { certificate } = require("./CertificateGenerator");
const childProcess = require('child_process');
const zlib = require("node:zlib");
const fs = require('fs');
const { logger, parse } = require("../utilities");
const pngStringify = require('console-png');
const database = require('./Database');
const tasker = require('./Tasker');
const { DatabaseLoader } = require("./DatabaseLoader");
const path = require('path');


class Server {
    constructor() {

        this.registerCertificate();

        this.app = require('fastify')({
            logger: {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        singleLine: true
                    }
                },
                serializers: {
                    req(request) {
                        return `[${request.method}] ${request.url}`;
                    },
                    res(reply) {
                        return `${reply.statusCode}`;
                    }
                }
            },
            http2: true,
            https: {
                allowHTTP1: true,
                key: this.cert.key,
                cert: this.cert.cert
            },
            onProtoPoisoning: "remove"
        });
    }

    getApp() {
        return this.app;
    }

    loadPlugins() {
        this.app.register(require('../plugins/register.js'));
    }

    loadContentTypeParser() {

        this.app.removeContentTypeParser("application/json");
        this.app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {

            if (req.url === "/client/raid/profile/save") {
                console.log("balles")
            }

            if (req.headers["user-agent"] !== undefined &&
                req.headers['user-agent'].includes(['UnityPlayer' || 'Unity'])) {
                try {
                    zlib.inflate(body, function (err, buffer) {
                        if (err && buffer === undefined) {
                            err.statusCode = 404;
                            logger.error(`Buffer is undefined`);
                            done(err, false);
                            return;
                        }
                        const inflatedString = buffer.toString('utf8');
                        if (inflatedString.length > 0) {
                            const data = JSON.parse(inflatedString);
                            done(null, data);
                        } else {
                            done(null, false);
                        }
                    });
                } catch (error) {
                    error.statusCode = 404;
                    done(error, undefined);
                    return;
                }
            } else {
                try {
                    const json = JSON.parse(body);
                    done(null, json);
                } catch (error) {
                    error.statusCode = 404;
                    done(error, undefined);
                }
            }

        });


        this.app.addContentTypeParser('*', (req, payload, done) => {
            const chunks = [];
            payload.on('data', chunk => {
                chunks.push(chunk);
            });
            payload.on('end', () => {
                done(null, Buffer.concat(chunks));
            });
        });
    }

    async startServer() {
        await DatabaseLoader.setDatabase();

        tasker.execute();

        this.app.listen({
            port: database.core.serverConfig.port,
            host: database.core.serverConfig.ip
        });
    }

    registerCertificate() {
        if (process.platform === 'win32' || process.platform === 'win64') {
            this.cert = certificate.generate(database.core.serverConfig.ip, database.core.serverConfig.hostname, 3);

            const clearCertificateScriptPath = path.resolve('./assets/scripts/clear-certificate.ps1');
            childProcess.execSync(`powershell.exe -ExecutionPolicy Bypass -File "${clearCertificateScriptPath}"`);

            const installCertificateScriptPath = path.resolve('./assets/scripts/install-certificate.ps1');
            const installCertificateScript = fs.readFileSync(installCertificateScriptPath);
            const installCertificatePowerShell = childProcess.spawn('powershell', [installCertificateScript]);

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
            this.cert = certificate.generate(database.core.serverConfig.ip, database.core.serverConfig.hostname, 365);
        }
    }

    printLogo() {
        const image = fs.readFileSync(path.resolve('./assets/templates/webinterface/resources/logo/rs_banner_transparent.png'));

        pngStringify(image, function (err, string) {
            if (err) throw err;
            logger.success(string);
        });
    }

}

module.exports = Server;
