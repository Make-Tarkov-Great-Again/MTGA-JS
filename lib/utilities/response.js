const { resolve } = require("path");
const zlib = require("zlib");
const { stringify } = require("./fileIO");


class Response {
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
            "server": Response.getServerAddress(),
            "channel_id": sessionID,
            "ws": `${Response.getWebSocketDirectUrl()}`,
            "url": `${Response.getBackendUrl()}`
        };
    }

    static async getVersion(request) {
        return request.headers["app-version"].replace("EFT Client ", "");
    }

    static getServerAddress() {
        const { database: { core: { serverConfig: { ip, port } } } } = require("../../app");
        return `${ip}:${port}`;
    }

    static getBackendUrl() {
        return `https://${Response.getServerAddress()}/`;
    }

    static getWebSocketUrl(sessionID) {
        return `wss://${Response.getServerAddress()}/socket/${sessionID}`;
    }

    static getWebSocketDirectUrl() {
        return `${Response.getServerAddress()}`;
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
        const string = stringify(data);
        reply.raw.writeHead(200, header);
        zlib.deflate(string, (err, buff) => {
            reply.raw.end(buff);
        });
/*         
        const deflatedData = zlib.deflateSync(string);
        reply.raw.write(deflatedData);
        reply.raw.end();
*/
    };

    static async zlibReply(reply, data) {
        reply.raw.writeHead(200);
        zlib.deflate(data, (err, buff) => {
            reply.raw.end(buff);
        });
    };

    static async applyBody(data, err = 0, errmsg = null) {
        return { "err": err, "errmsg": errmsg, "data": data };
    };
}

module.exports.Response = Response;
