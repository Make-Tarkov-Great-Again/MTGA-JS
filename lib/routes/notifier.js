const { Response } = require("../utilities");
const { NotificationController } = require("../controllers/NotificationController");


module.exports = async function notifierRoutes(app, _opt) {

    // Client Notifier Routes //
    app.post("/client/WebSocketAddress", async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        const data = await Response.getWebSocketUrl(sessionID);
        return Response.zlibReply(
            reply,
            data
        );
    });

    app.post("/client/notifier/channel/create", async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        const data = await Response.getNotifier(sessionID)
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(data)
        );
    });

    app.get("/socket/:sessionID", { websocket: true }, async (connection, request) => {
        await NotificationController.onUpgrade(connection, request);
    });
};
