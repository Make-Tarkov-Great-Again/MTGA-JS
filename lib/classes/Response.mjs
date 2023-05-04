import zlib from "zlib";
import { stringify } from "../utilities/fileIO.mjs";
import { database } from "../../app.mjs";

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


    static applyBody(data, err = 0, errmsg = null) {
        return { err: err, errmsg: errmsg, data: data };
    };
}

