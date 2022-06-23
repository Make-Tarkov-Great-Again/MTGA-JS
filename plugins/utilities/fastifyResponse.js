const zlib = require("zlib");
const { logger } = require(".");
const { stringify } = require("./fileIO");


class fastifyResponse {
    static mime = {
        html: "text/html",
        txt: "text/plain",
        jpg: "image/jpeg",
        png: "image/png",
        css: "text/css",
        otf: "font/opentype",
        json: "application/json",
    }

    // HTTP Data Processing functionality //

    static zlibJsonReply = async (reply, data) => {
        logger.logDebug("[zlibJsonReply] Compressing data:")
        logger.logDebug(stringify(data));
        let header = { 
            'Content-Type': this.mime["json"],
        }
        let deflatedData = zlib.deflateSync(stringify(data, true));
        reply.raw.writeHead(200, header)
        reply.raw.write(deflatedData);
        reply.raw.end()
    }

    static applyBody = (data, err = 0, errmsg = null) => {
        return { "err": err, "errmsg": errmsg, "data": data };
    }
}

module.exports.fastifyResponse = fastifyResponse;