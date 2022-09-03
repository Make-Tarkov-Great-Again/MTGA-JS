const { FastifyResponse } = require("../utilities");
const { NotificationController } = require("../lib/controllers/NotificationController");


module.exports = async function notifierRoutes(app, _opt) {

    // Client Notifier Routes //
    app.post("/client/WebSocketAddress", async (request, reply) => {
        return FastifyResponse.zlibReply(
            reply,
            FastifyResponse.getWebSocketUrl(await FastifyResponse.getSessionID(request))
        );
    });

    app.post("/client/notifier/channel/create", async (request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(FastifyResponse.getNotifier(await FastifyResponse.getSessionID(request)))
        );
    });

    app.get("/socket/:sessionID", { websocket: true }, async (connection, request) => {
        await NotificationController.onUpgrade(connection, request);
    });
};
