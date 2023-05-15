import zlib from "zlib";
import { stringify } from "../utilities/fileIO.mjs";
import { database } from "../../app.mjs";

export class Response {

    static getNotifier(sessionID) {
        const { server, backend, websocket: ws } = this;
        return { server, channel_id: sessionID, url: backend, notifierServer: backend, ws };
    }

    static _getNotifier(sessionID) {
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
        return request.headers["app-version"]?.replace("EFT Client ", "") ?? "Unknown";
    }

    static getServerAddress() {
        const { ip, port } = database.core.serverConfig;
        return `${ip}:${port}`;
    }

    static getBackendUrl() {
        return `https://${this.getServerAddress()}/`;
    }

    static getWebSocketUrl(sessionID) {
        return `wss://${this.getServerAddress()}/socket/${sessionID}`;
    }

    static getWebSocketDirectUrl() {
        return this.getServerAddress();
    }

    static getSessionID(request) {
        return request?.cookies?.PHPSESSID || false;
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
        reply.raw.writeHead(200, {
            'Content-Type': 'application/json'
        });

        const { url } = reply.request;
        const { STATIC, REPLY } = database.core.zlib;

        if (REPLY[url]) {
            reply.raw.end(REPLY[url]);
        }

        const inReply = STATIC.includes(url);
        const buffer = Buffer.from(stringify(data, true));

        zlib.deflate(buffer, (err, buff) => {
            if (inReply) {
                REPLY[url] = buff;
                reply.raw.end(REPLY[url]);
            }
            reply.raw.end(buff);
        });
    };

    static async zlibReply(reply, data) {
        reply.raw.writeHead(200);
        zlib.deflate(data, (err, buff) => {
            reply.raw.end(buff);
        });
    };

    static applyEmpty(type) {
        const EMPTY_VALUES = {
            string: '',
            array: [],
            null: null,
            object: {},
            empty: ['', 0, ''],
        };

        const body = EMPTY_VALUES[type];

        return this.applyBody(body);
    }

    static applyBody(data, err = 0, msg = null) {
        return { err, msg, data };
    }
}

