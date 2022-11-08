const { Response } = require("../utilities");
const { NotificationController } = require("../controllers/NotificationController");


module.exports = async function notifierRoutes(app, _opt) {

    // Client Notifier Routes //
    app.post("/client/WebSocketAddress", async (request, reply) => {
        return Response.zlibReply(
            reply,
            Response.getWebSocketUrl(await Response.getSessionID(request))
        );
    });

    app.post("/client/notifier/channel/create", async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(Response.getNotifier(await Response.getSessionID(request)))
        );
    });

    app.get("/socket/:sessionID", { websocket: true }, async (connection, request) => {
        await NotificationController.onUpgrade(connection, request);
    });
};
