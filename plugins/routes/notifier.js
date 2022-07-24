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

    app.get('/push/notifier/get/', { websocket: true }, async (connection, req) => {
        logger.logError("NOTIFIER GET WS HIT");
        connection.socket.on('message', message => {
            connection.socket.send('Hello Fastify WebSockets');
        });
    })

    app.get('/push/notifier/getwebsocket/', { websocket: true }, async (connection, req) => {
        logger.logError("NOTIFIER getwebsocket GET WS HIT");
        connection.socket.on('connection', (connection) => {
            logger.logError("CONNECTION")
            connection.socket.on('message', message => {
                connection.socket.send('Hello Fastify WebSockets');
            });
        })
        
    })
};
