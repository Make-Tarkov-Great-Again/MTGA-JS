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

    app.route({
        method: "POST",
        url: '/:lastID',
        handler: async (request, reply) => {
            console.log(request.body, request.params)
            logger.logError("NOTIFIER HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ok")
            );
        }
    });

    app.route({
        method: "POST",
        url: '/push/notifier/get/',
        handler: async (request, reply) => {
            console.log(request.body, request.params)

            logger.logError("NOTIFIER GET HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ok")
            );
        }
    })

    app.route({
        method: "POST",
        url: '/push/notifier/getwebsocket/',
        handler: async (request, reply) => {
            console.log(request.body, request.params)

            logger.logError("NOTIFIER getwebsocket GET HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ok")
            );
        }
    })

    app.route({
        method: "POST",
        url: '/notifierServer',
        handler: async (request, reply) => {
            console.log(request.body, request.params)

            logger.logError("NOTIFIER SERVER HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ok")
            );
        }       
    })
};
