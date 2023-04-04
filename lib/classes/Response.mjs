import zlib from "zlib";
import { stringify } from "../utilities/fileIO.mjs";
import { database } from "../../app.mjs";

export class Response {
    static async getNotifier(sessionID) {
        const { server, backend, websocket } = {
            server: getServerAddress(),
            backend: getBackendUrl(),
            websocket: getWebSocketDirectUrl(),
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
        const server = getServerAddress();
        return `https://${server}/`;
    }

    static getWebSocketUrl(sessionID) {
        const server = getServerAddress();
        return `wss://${server}/socket/${sessionID}`;
    }

    static getWebSocketDirectUrl() {
        const server = getServerAddress();
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

    static async textJsonReply(reply, data) {
        const header = {
            'Content-Type': 'application/json'
        };
        const string = stringify(data, true);

        reply.raw.writeHead(200, header);
        reply.send(string);
    };

    static async zlibJsonReply(reply, data) {
        const header = {
            'Content-Type': 'application/json'
        };
        const string = stringify(data, true);

        reply.raw.writeHead(200, header);
        zlib.deflate(string, (err, buff) => {
            reply.raw.end(buff);
        });
    };

    static async zlibReply(reply, data) {
        reply.raw.writeHead(200);
        zlib.deflate(data, (err, buff) => {
            reply.raw.end(buff);
        });
    };

    static async applyEmpty(type) {
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