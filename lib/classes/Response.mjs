import zlib from "zlib";
import { stringify } from "../utilities/fileIO.mjs";
import { database } from "../../app.mjs";

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

export class Response {
    static getNotifier(sessionID) {
        const { server, backend, websocket } = {
            server: this.getServerAddress(),
            backend: this.getBackendUrl(),
            websocket: this.getWebSocketDirectUrl()
        };
        return {
            server,
            channel_id: sessionID,
            url: backend,
            notifierServer: backend,
            ws: websocket
        };
    }

    static getVersion(request) {
        return request.headers["app-version"].replace("EFT Client ", "");
    }

    static getServerAddress() {
        const { core: { serverConfig: { ip, port } } } = database;
        return `${ip}:${port}`;
    }

    static getBackendUrl() {
        const server = this.getServerAddress();
        return `https://${server}/`;
    }

    static getWebSocketUrl(sessionID) {
        const server = this.getServerAddress();
        return `wss://${server}/socket/${sessionID}`;
    }

    static getWebSocketDirectUrl() {
        const server = this.getServerAddress();
        return `${server}`;
    }

    static getSessionID(request) {
        return request?.cookies?.PHPSESSID ? request.cookies.PHPSESSID : false;
    };

    static errorToOutput(output, message = "¯\_(ツ)_/¯", errorCode = 0) {
        output.warnings = [{
            index: 0,
            errmsg: message,
            code: errorCode.toString()
        }];

        return output;
    }

    // HTTP Data Processing functionality //
    // unused ?
    static textJsonReply(reply, data) {
        const header = {
            'Content-Type': 'application/json'
        };
        const string = stringify(data, true);

        reply.raw.writeHead(200, header);
        reply.send(string);
    };

    static async zlibJsonReply(reply, data) {
        const url = reply.request.url;

        const header = {
            'Content-Type': 'application/json'
        };
        const string = stringify(data, true);

        reply.raw.writeHead(200, header);
        if (database.zlib.reply[url]) {
            reply.raw.end(database.zlib.reply[url]);
        } else {
            zlib.deflate(string, (err, buff) => {
                if (ROUTE.includes(url))
                    database.zlib.reply[reply.request.url] = buff;
                reply.raw.end(buff);
            });
        }
    };

    static async zlibReply(reply, data) {
        reply.raw.writeHead(200);
        zlib.deflate(data, (err, buff) => {
            reply.raw.end(buff);
        });
    };


    static applyEmpty(type) {

        let body;
        switch (type) {
            case "string":
                body = "";
                break;
            case "array":
                body = [];
                break;
            case "null":
                body = null;
                break;
            case "object":
                body = {};
                break;
            case "empty":
                body = ["", 0, ""];
                break;
            default:
                return;
        }
        return this.applyBody(body);
    }

    static applyBody(data, err = 0, errmsg = null) {
        return { err: err, errmsg: errmsg, data: data };
    };
}

