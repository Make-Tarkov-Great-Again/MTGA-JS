const zlib = require("zlib");
const { stringify } = require("./fileIO");

/* 
const BackendErrorCodes =
{
NONE = 0,
UNKNOWN_ERROR = 200,
NOT_AUTHORIZED = 201,
NEED_AUTHORIZATION_CODE = 209,
WRONG_AUTHORIZATION_CODE = 211,
NEED_CAPTCHA = 214,
NO_NEED_CAPTCHA = 215,
CAPTCHA_FAILED = 218,
CAPTCHA_BRUTE_FORCED = 219,
NO_ROOM_IN_STASH = 223,
NICKNAME_NOT_UNIQUE = 225,
NICKNAME_NOT_VALID = 226,
UNSUPPORTED_CLIENT_VERSION = 232,
REPORT_NOT_ALLOWED = 238,
NICKNAME_IS_ABUSIVE = 241,
NICKNAME_CHANGE_TIMEOUT = 242,
NOT_MODIFIED = 304,
HTTP_BAD_REQUEST = 400,
HTTP_NOT_AUTHORIZED = 401,
HTTP_FORBIDDEN = 403,
HTTP_NOT_FOUND = 404,
HTTP_METHOD_NOT_ALLOWED = 405,
UNKNOWN_TRADING_ERROR = 500,
HTTPNOTIMPLEMENTED = 501,
HTTPBADGATEWAY = 502,
HTTPSERVICEUNAVAILABLE = 503,
HTTPGATEWAYTIMEOUT = 504,
TRADEROUTOFMONEY = 505,
HTTPVARIANTALSONEGOTIATES = 506,
PRICECHANGED = 509,
TRADERDISABLED = 512,
ITEMHASBEENSOLD = 513,
NOTENOUGHSPACEFORMONEY = 518,
HTTPINVALIDSSLCERTIFICATE = 526,
UNKNOWNRAGFAIRERROR = 550,
UNKNOWNRAGFAIRERROR2 = 551,
UNKNOWNMATCHMAKERERROR = 600,
SESSIONPARAMETERSERROR = 601,
SESSIONLOST = 602,
SERVERNOTREGISTERED = 604,
UNKNOWNQUESTERROR = 700,
QUESTBADPARAM = 702,
QUESTNOTFOUND = 703,
QUESTISUNAVAILABLE = 704,
NOFREESPACEFORREWARDS = 705,
WRONGQUESTSTATUS = 706,
CANTCOMPLETEQUEST = 707,
UNKNOWNMAILERROR = 900,
TOOMANYFRIENDREQUESTS = 925,
UNKNOWNSCRIPTEXECUTIONERROR = 1000,
UNKNOWNREPAIRINGERROR = 1200,
UNKNOWNINSURANCEERROR = 1300,
UNKNOWNCURRENCYEXCHANGEERROR = 1400,
OFFERNOTFOUND = 1503,
NOTENOUGHSPACE = 1505,
OFFEROUTOFSTOCK = 1506,
OFFERSOLD = 1507,
RAGFAIRUNAVAILABLE = 1511,
BANNEDERRORCODE = 1513,
INSUFFICIENTNUMBERINSTOCK = 1516,
TOOMANYITEMSTOSELL = 1517,
EXAMINATIONFAILED = 22001,
ITEMALREADYEXAMINED = 22002,
UNKNOWNNGINXERROR = 9000,
PARSERESPONSEERROR = 9001
}
 */

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

    static async errorToOutput(output, message = "¯\_(ツ)_/¯", errorCode = 0) {
        output.warnings = [{
            index: 0,
            errmsg: message,
            code: errorCode.toString()
        }];

        return output;
    }

    // HTTP Data Processing functionality //

    static async zlibJsonReply(reply, data) {
        const header = {
            'Content-Type': this.mime["json"]
        };
        const string = stringify(data, true);

        reply.raw.writeHead(200, header);
        zlib.deflate(string, (err, buff) => {
            reply.raw.end(buff);
        });
    };

    /**
     * Unused for the moment...
     * @param {*} reply 
     * @param {*} data 
     */
    static async zlibReply(reply, data) {
        reply.raw.writeHead(200);
        zlib.deflate(data, (err, buff) => {
            reply.raw.end(buff);
        });
    };

    /**
     * Apply templated response
     * @param {*} type "string", "array", "null"
     */
    static async applyEmpty(type){
        switch (type){
            case "string":
                return this.applyBody("");
            case "array":
                return this.applyBody([]);
            case "null":
                return this.applyBody(null);
        }
    }

    static async applyBody(data, err = 0, errmsg = null) {
        return { err: err, errmsg: errmsg, data: data };
    };
}

module.exports.Response = Response;
