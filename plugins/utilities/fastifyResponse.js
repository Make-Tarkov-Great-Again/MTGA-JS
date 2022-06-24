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

    static getBackendURL() {
        const { database } = require("../../app");
        return "https://" + database.core.serverConfig.ip + ":" + database.core.serverConfig.port;
    }

    static getSessionID = async (request) => {
        const sessionID = request.cookies.PHPSESSID;
        if (sessionID) {
            return sessionID;
        } else {
            return false;
        }
    }

    // HTTP Data Processing functionality //

    static zlibJsonReply = async (reply, data) => {
        logger.logDebug("[zlibJsonReply] Compressing data:");
        //logger.logDebug(stringify(data));
        let header = {
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

module.exports.fastifyResponse = FastifyResponse;