import { execSync, spawn } from 'child_process';
import { inflate } from "node:zlib";
import { logger, read, readParsed, checkInternet } from "../utilities/_index.mjs";
import terminalImage from 'terminal-image';
import { resolve } from 'path';
import database from './Database.mjs';
import { Mod } from '../classes/Mod.mjs';
import { default as fp } from '../plugins/register.mjs';
import Fastify from "fastify";
import certificate from "./CertificateGenerator.mjs";
import { Client } from "@xhayper/discord-rpc";

const ROUTE = [
    "/client/items",
    "/client/languages",
    "/client/locations",
    "/client/game/profile/select",
    "/client/game/keepalive",
    "/client/checkVersion",
    "/client/settings",
    "/client/globals",
    "/client/handbook/templates",
    "/client/hideout/areas",
    "/client/hideout/production/recipes",
    "/client/hideout/qte/list",
    "/client/hideout/settings",
    "/client/customization",
    "/client/server/list",
    "/client/trading/api/traderSettings",
    "/client/notifier/channel/create",


    "/singleplayer/settings/bot/difficulty/marksman/easy",
    "/singleplayer/settings/bot/difficulty/marksman/normal",
    "/singleplayer/settings/bot/difficulty/marksman/hard",
    "/singleplayer/settings/bot/difficulty/marksman/impossible",
    "/singleplayer/settings/bot/difficulty/assault/easy",
    "/singleplayer/settings/bot/difficulty/assault/normal",
    "/singleplayer/settings/bot/difficulty/assault/hard",
    "/singleplayer/settings/bot/difficulty/assault/impossible",
    "/singleplayer/settings/bot/difficulty/bossTest/normal",
    "/singleplayer/settings/bot/difficulty/bossBully/normal",
    "/singleplayer/settings/bot/difficulty/bossKilla/normal",
    "/singleplayer/settings/bot/difficulty/followerBully/normal",
    "/singleplayer/settings/bot/difficulty/followerTest/normal",
    "/singleplayer/settings/bot/difficulty/bossKojaniy/normal",
    "/singleplayer/settings/bot/difficulty/followerKojaniy/normal",
    "/singleplayer/settings/bot/difficulty/pmcBot/normal",
    "/singleplayer/settings/bot/difficulty/cursedAssault/easy",
    "/singleplayer/settings/bot/difficulty/cursedAssault/normal",
    "/singleplayer/settings/bot/difficulty/cursedAssault/hard",
    "/singleplayer/settings/bot/difficulty/cursedAssault/impossible",
    "/singleplayer/settings/bot/difficulty/bossGluhar/normal",
    "/singleplayer/settings/bot/difficulty/followerGluharAssault/normal",
    "/singleplayer/settings/bot/difficulty/followerGluharSecurity/normal",
    "/singleplayer/settings/bot/difficulty/followerGluharScout/normal",
    "/singleplayer/settings/bot/difficulty/followerGluharSnipe/normal",
    "/singleplayer/settings/bot/difficulty/followerSanitar/normal",
    "singleplayer/settings/bot/difficulty/bossSanitar/normal",
    "/singleplayer/settings/bot/difficulty/test/normal",
    "/singleplayer/settings/bot/difficulty/sectantWarrior/normal",
    "/singleplayer/settings/bot/difficulty/sectantPriest/normal",
    "/singleplayer/settings/bot/difficulty/bossTagilla/normal",
    "/singleplayer/settings/bot/difficulty/followerTagilla/normal",
    "/singleplayer/settings/bot/difficulty/exUsec/normal",
    "/singleplayer/settings/bot/difficulty/gifter/normal",
    "/singleplayer/settings/bot/difficulty/bossKnight/normal",
    "/singleplayer/settings/bot/difficulty/followerBigPipe/normal",
    "/singleplayer/settings/bot/difficulty/followerBirdEye/normal",
    "/singleplayer/settings/bot/difficulty/bossZryachiy/normal",
    "/singleplayer/settings/bot/difficulty/followerZryachiy/normal",
    "/singleplayer/settings/bot/difficulty/arenaFighterEvent/normal"
];



class Server {
    constructor() {
        this.database = database; // raw instance
    }

    async setFastify() {
        this.app = Fastify({
            logger: logger,
            http2: true,
            https: {
                allowHTTP1: true,
                key: this.cert.key,
                cert: this.cert.cert
            }
        });
    }

    async setServerConfig() {
        this.database.core.serverConfig = await readParsed('./assets/database/configs/server.json', true);
    }

    async registerPlugins() {
        this.app.register(fp);
    }

    async setContentTypeParser() {
        this.app.removeContentTypeParser("application/json");

        const jsonParser = (req, body, done) => {
            if (this.database.zlib.request[req.url]) {
                return done(null, this.database.zlib.request[req.url]);
            }

            const { headers, url } = req;
            const inHeader = headers?.["user-agent"].includes("Unity")
            const inRoute = ROUTE.includes(url);

            if (inHeader) {
                try {
                    inflate(body, (error, buffer) => {
                        if (!buffer) {
                            error.statusCode = 500;
                            return done(error, undefined);
                        }
                        const inflatedString = buffer.toString('utf-8');
                        const parsedBody = inflatedString.length > 0 ? JSON.parse(inflatedString) : null;

                        if (inRoute) {
                            this.database.zlib.request[url] = parsedBody;
                        }
                        return done(null, parsedBody);
                    });
                } catch (error) {
                    error.statusCode = 404;
                    return done(error, undefined);
                }
            } else {
                try {
                    const parsedBody = JSON.parse(body.toString());
                    if (inRoute) {
                        this.database.zlib.request[url] = parsedBody;
                    }
                    return done(null, parsedBody);
                } catch (error) {
                    err.statusCode = 404;
                    return done(error, undefined);
                }
            }
        }

        this.app.addContentTypeParser('application/json', { parseAs: 'buffer' }, jsonParser);



        /*         this.app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
                    if ("user-agent" in req.headers && req.headers['user-agent'].includes("Unity")) {
                        try {
                            inflate(body, (err, buffer) => {
                                try {
                                    if (err && !buffer) {
                                        err.statusCode = 404;
                                        logger.error(`Buffer is undefined`);
                                        return done(err);
                                    }
                                    const inflatedString = buffer.toString('utf8');
                                    if (inflatedString.length > 0)
                                        return done(null, JSON.parse(inflatedString));
                                    return done(null);
                                } catch (error) {
                                    error.statusCode = 404;
                                    return done(error, undefined);
                                }
                            });
                        } catch (error) {
                            error.statusCode = 404;
                            return done(error, undefined);
                        }
                    } else {
                        try {
                            return done(null, JSON.parse(body.toString()));
                        } catch (error) {
                            error.statusCode = 404;
                            return done(error, undefined);
                        }
                    }
                }); */

        this.app.addContentTypeParser('*', (req, payload, done) => {
            const { method } = req;
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                const body = [];
                payload.on('data', chunk => body.push(chunk));
                payload.on('end', () => {
                    done(null, Buffer.concat(body));
                });
            } else {
                done();
            }
        });

        /*         this.app.addContentTypeParser('*', (req, payload, done) => {
                    let body = '';
                    payload.on('data', chunk => {
                        body += chunk;
                    });
                    payload.on('end', () => {
                        done(null, Buffer.from(body));
                    });
                }); */
    }

    async setDiscordRichPresense() {
        if (!(await checkInternet())) {
            logger.warn("No Internet Connection available - Discord Rich Presense skipped!");
            this.database.connection = false;
            return;
        }

        try {
            this.rpc = new Client({
                clientId: "1082884762181566475",
                timeout: 10000 // timeout value in milliseconds
            });

            await this.initializeDiscordRichPresence();
            return this.rpc.login();
        } catch (error) {
            logger.error(`Error setting up Discord Rich Presence: ${error}`);
        }
    }

    async initializeDiscordRichPresence() {
        const activity = {
            state: "MTGA Initialization",
            details: "Initializing Backend Server",
            //startTimestamp: Date.now(),
            largeImageKey: "logo",
            largeImageText: "Make Tarkov Great Again",
        };

        this.rpc.on("ready", async () => {
            logger.info("Discord Rich Presense is Initialized!");
            await this.rpc.user?.setActivity(activity);
        });
    }

    async initializeServer() {
        await this.database.initialize();
        await this.setDiscordRichPresense();
        await this.startServer();
    }

    async initializeMods() {
        await Mod.setMods();
        await Mod.loadMods();
    }

    async startServer() {
        this.app.listen({
            port: this.database.core.serverConfig.port,
            host: this.database.core.serverConfig.ip
        });
    }

    async registerCertificate() {
        switch (process.platform) {
            case 'win32':
            case 'win64':
                await this.importRootCertWindows();
                break;
            case 'linux':
                logger.warn("Currently we are installing the root SSL certificate via PowerShell. Linux is unavailable at this time!");
                this.cert = await certificate.generate(this.database.core.serverConfig.ip, this.database.core.serverConfig.hostname, 365);
                break;
            default:
                this.cert = await certificate.generate(this.database.core.serverConfig.ip, this.database.core.serverConfig.hostname, 365);
                break;
        }
    }

    async importRootCertWindows() {
        this.cert = await certificate.generate(this.database.core.serverConfig.ip, this.database.core.serverConfig.hostname, 3);

        const clearCertificateScriptPath = resolve('./assets/scripts/clear-certificate.ps1');
        execSync(`powershell.exe -ExecutionPolicy Bypass -File "${clearCertificateScriptPath}"`);

        const installCertificateScriptPath = resolve('./assets/scripts/install-certificate.ps1');
        const installCertificateScript = await read(installCertificateScriptPath, false);
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
    }

    async printLogo() {
        console.log(await terminalImage.file('./assets/templates/webinterface/resources/logo/rs_banner_transparent.png'));
    }

}

export default new Server;
