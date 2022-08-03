const zlib = require("zlib");
const { stringify } = require("./fileIO");
const logger = require("./logger");


class FastifyResponse {
    static mime = {
        html: "text/html",
        txt: "text/plain",
        jpg: "image/jpeg",
        png: "image/png",
        css: "text/css",
        otf: "font/opentype",
        json: "application/json"
    };

    static getNotifier(sessionID) {
        return {
            "server": FastifyResponse.getUrl(),
            "channel_id": sessionID,
            "ws": `${FastifyResponse.getWebSocketDirectUrl()}`
        };
    }

    static getVersion = async (request) => {
        return request.headers["app-version"].replace("EFT Client ", "");
    }

    static getUrl() {
        const { database } = require("../app");
        return `${database.core.serverConfig.ip}:${database.core.serverConfig.port}`;
    }


    static getBackendUrl() {
        return `https://${FastifyResponse.getUrl()}/`;
    }

    static getWebSocketUrl() {
        return `wss://${FastifyResponse.getUrl()}/socket`;
    }

    static getWebSocketDirectUrl() {
        return `${FastifyResponse.getUrl()}`;
    }

    static getSessionID = async (request) => {
        const sessionID = request.cookies.PHPSESSID;
        if (sessionID) {
            return sessionID;
        } else {
            return false;
        }
    };

    // HTTP Data Processing functionality //

    static zlibJsonReply = async (reply, data) => {
        const header = {
            'Content-Type': this.mime["json"],
        };
        const deflatedData = zlib.deflateSync(stringify(data, true));
        reply.raw.writeHead(200, header);
        reply.raw.write(deflatedData);
        reply.raw.end();
    };

    static zlibReply = async (reply, data) => {
        const deflatedData = zlib.deflateSync(data);
        reply.raw.writeHead(200);
        reply.raw.write(deflatedData);
        reply.raw.end();
    };

    static applyBody = (data, err = 0, errmsg = null) => {
        return { "err": err, "errmsg": errmsg, "data": data };
    };
}

module.exports.FastifyResponse = FastifyResponse;