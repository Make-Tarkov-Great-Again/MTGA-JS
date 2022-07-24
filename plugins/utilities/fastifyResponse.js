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
            "server": this.getUrl(),
            "channel_id": sessionID,
            "url": `${this.getBackendURL()}/push/notifier/get/${sessionID}`,
            "notifierServer": `${this.getBackendURL()}/push/notifier/get/${sessionID}`,
            "ws": `${this.getWebSocketURL()}/push/notifier/getwebsocket/${sessionID}`
        }
    }

    static getVersion = async (request) => {
        return request.headers["app-version"].replace("EFT Client ", "");
    }

    static getUrl() {
        const { database } = require("../../app");
        return `${database.core.serverConfig.ip}:${database.core.serverConfig.port}`;
    }


    static getBackendURL() {
        return "https://" + this.getUrl();
    }

    static getWebSocketURL() {
        return `ws://${this.getUrl()}`;
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
            'Content-Type': this.mime["json"]
        };
        const deflatedData = zlib.deflateSync(stringify(data, true));
        reply.raw.writeHead(200, header);
        reply.raw.write(deflatedData);
        reply.raw.end();
    };

    static applyBody = (data, err = 0, errmsg = null) => {
        return { "err": err, "errmsg": errmsg, "data": data };
    };
}

module.exports.FastifyResponse = FastifyResponse;