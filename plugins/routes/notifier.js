'use strict'
const { logger, FastifyResponse, writeFile } = require("../utilities");


module.exports = async function notifierRoutes(app, opt) {

    // Client Notifier Routes //
    app.post("/client/notifier/channel/create", async (request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(FastifyResponse.getNotifier(await FastifyResponse.getSessionID(request)))
        );
    });

    app.route({
        method: "GET",
        url: '/push/notifier/get/:sessionID',
        handler: async (request, reply) => {
            logger.logError("NOTIFIER GET HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody([])
            );
        },
        wsHandler: (conn, req) => {
            logger.logError("NOTIFIER GET WS HIT");
            conn.write("wassup nigga");
            conn.once('data', chunk => {
                conn.end();
            })
        }
    })

    app.route({
        method: "GET",
        url: '/push/notifier/getwebsocket/:sessionID',
        handler: async (request, reply) => {
            logger.logError("NOTIFIER getwebsocket GET HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody([])
            );
        },
        wsHandler: (conn, req) => {
            logger.logError("NOTIFIER getwebsocket GET WS HIT");
            conn.write("wassup nigga");
            conn.once('data', chunk => {
                conn.end();
            })
        }
    })
};
