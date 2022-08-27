const { logger, FastifyResponse } = require("../utilities");


module.exports = async function notifierRoutes(app, _opt) {

    // Client Notifier Routes //
    app.post("/client/WebSocketAddress", async (_request, reply) => {
        const sessionID = await FastifyResponse.getSessionID(_request);
        return FastifyResponse.zlibReply(
            reply,
            FastifyResponse.getWebSocketUrl(sessionID)
        );
    });

    app.post("/client/notifier/channel/create", async (request, reply) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(FastifyResponse.getNotifier(sessionID))
        );
    });

    app.get("/socket/:sessionID", { websocket: true }, async (connection, request, _reply) => {
        logger.logDebug(request.params.sessionID);
        logger.logError("NOTIFIER getwebsocket GET HIT");
        connection.socket.on('message', _message => {
            connection.socket.send('NOTIFIER message HIT');
        });

        connection.socket.on('upgrade', _message => {
            connection.socket.send('NOTIFIER upgrade HIT');
        });
    });

};
