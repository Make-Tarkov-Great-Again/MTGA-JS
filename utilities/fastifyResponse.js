const zlib = require("zlib");
const { stringify } = require("./fileIO");


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
            "server": FastifyResponse.getServerAddress(),
            "channel_id": sessionID,
            "ws": `${FastifyResponse.getWebSocketDirectUrl()}`,
            "url": `${FastifyResponse.getBackendUrl()}`
        };
    }

    static async getVersion(request) {
        return request.headers["app-version"].replace("EFT Client ", "");
    }

    static getServerAddress() {
        const { database: { core: { serverConfig: { ip, port } } } } = require("../app");
        return `${ip}:${port}`;
    }

    static getBackendUrl() {
        return `https://${FastifyResponse.getServerAddress()}/`;
    }

    static getWebSocketUrl(sessionID) {
        return `wss://${FastifyResponse.getServerAddress()}/socket/${sessionID}`;
    }

    static getWebSocketDirectUrl() {
        return `${FastifyResponse.getServerAddress()}`;
    }

    static async getSessionID(request) {
        const sessionID = request.cookies.PHPSESSID;
        if (sessionID) {
            return sessionID;
        } else {
            return false;
        }
    };

    // HTTP Data Processing functionality //

    static async zlibJsonReply(reply, data) {
        const header = {
            'Content-Type': this.mime["json"]
        };
        const deflatedData = zlib.deflateSync(stringify(data, true));
        reply.raw.writeHead(200, header);
        reply.raw.write(deflatedData);
        reply.raw.end();
    };

    static async zlibReply(reply, data) {
        const deflatedData = zlib.deflateSync(data);
        reply.raw.writeHead(200);
        reply.raw.write(deflatedData);
        reply.raw.end();
    };

    static applyBody(data, err = 0, errmsg = null) {
        return { "err": err, "errmsg": errmsg, "data": data };
    };
}

module.exports.FastifyResponse = FastifyResponse;
