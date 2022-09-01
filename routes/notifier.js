const { logger, FastifyResponse } = require("../utilities");
const { Notification } = require('../lib/models/Notification')
const { NotificationController } = require("../lib/controllers/NotificationController");
const { InsuranceController } = require(`../lib/controllers/InsuranceController`);
const { Profile } = require("../lib/models/Profile");


module.exports = async function notifierRoutes(app, _opt) {

    // Client Notifier Routes //
    app.post("/client/WebSocketAddress", async (request, reply) => {
        const sessionID = await FastifyResponse.getSessionID(request);
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

    app.get("/socket/:sessionID", { websocket: true }, async (connection, request) => {
        await NotificationController.onUpgrade(connection, request);
    });
};
