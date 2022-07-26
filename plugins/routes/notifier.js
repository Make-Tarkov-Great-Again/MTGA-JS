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
        method: "POST",
        url: '/:lastID',
        handler: async (request, reply) => {
            logger.logError("NOTIFIER HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("NOTIFY")
            );
        },
        //wsHandler: (connection, req) => {
        //    logger.logError("NOTIFIER WS HIT");
        //    connection.socket.on('message', message => {
        //        connection.socket.send('Hello Fastify WebSockets');
        //    });
        //}
    });

    app.route({
        method: "POST",
        url: '/push/notifier/get/',
        handler: async (request, reply) => {
            logger.logError("NOTIFIER GET HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ok")
            );
        },
        //wsHandler: (connection, req) => {
        //    logger.logError("NOTIFIER GET WS HIT");
        //    connection.socket.on('message', message => {
        //        connection.socket.send('Hello Fastify WebSockets');
        //    });
        //}
    })

    app.route({
        method: "POST",
        url: '/push/notifier/getwebsocket/',
        handler: async (request, reply) => {
            logger.logError("NOTIFIER getwebsocket GET HIT");
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ok")
            );
        },
        //wsHandler: (connection, req) => {
        //    logger.logError("NOTIFIER getwebsocket GET WS HIT");
        //    connection.socket.on('message', message => {
        //        connection.socket.send('Hello Fastify WebSockets');
        //    });
        //}
    })
};
