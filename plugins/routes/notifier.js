'use strict'
const { logger, FastifyResponse, writeFile } = require("../utilities");


module.exports = async function notifierRoutes(app, opt) {

    // Client Notifier Routes //
    app.post("/client/notifier/channel/create", async (request, reply) => {
        console.log(request.body)
        const sessionID = await FastifyResponse.getSessionID(request)
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(FastifyResponse.getNotifier(sessionID))
        );
    });

    app.post("/:lastID", async (request, reply) => {
        logger.logError("NOTIFIER HIT");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody("NOTIFY")
        );
    });

    app.post("/push/notifier/get/:sessionID", async (request, reply) => {
        logger.logError("NOTIFIER GET HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ok")
        );
    });

    app.get("/push/notifier/getwebsocket/:sessionID", { websocket: true }, async (connection, request, reply) => {
        logger.logError("NOTIFIER getwebsocket GET HIT");
        connection.socket.on('message', message => {
            // message.toString() === 'hi from client'
            connection.socket.send('NOTIFIER getwebsocket GET HIT')
        })
    });

    app.post("/getNotifier", async (request, reply) => {
        logger.logError("NOTIFIER getwebsocket GET HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ok")
        );
    });
};
