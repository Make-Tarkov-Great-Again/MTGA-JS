import { NotificationController } from "../controllers/_index.mjs";
import { Response } from "../classes/_index.mjs";


export default async function notifierRoutes(app, _opt) {

    // Client Notifier Routes //
    app.post("/client/WebSocketAddress", async (request, reply) => {
        const sessionID = Response.getSessionID(request);
        const data = await getWebSocketUrl(sessionID);
        return zlibReply(
            reply,
            data
        );
    });

    app.post("/client/notifier/channel/create", async (request, reply) => {
        const sessionID = Response.getSessionID(request);
        const data = await getNotifier(sessionID)
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(data)
        );
    });

    app.get("/socket/:sessionID", { websocket: true }, async (connection, request) => {
        await NotificationController.onUpgrade(connection, request);
    });
};
