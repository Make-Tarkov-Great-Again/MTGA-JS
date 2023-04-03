import { zlibJsonReply, applyBody, getSessionID } from "../utilities/_index.mjs";
import { NotificationController } from "../controllers/_index.mjs";


export default async function notifierRoutes(app, _opt) {

    // Client Notifier Routes //
    app.post("/client/WebSocketAddress", async (request, reply) => {
        const sessionID = await getSessionID(request);
        const data = await getWebSocketUrl(sessionID);
        return zlibReply(
            reply,
            data
        );
    });

    app.post("/client/notifier/channel/create", async (request, reply) => {
        const sessionID = await getSessionID(request);
        const data = await getNotifier(sessionID)
        return zlibJsonReply(
            reply,
            await applyBody(data)
        );
    });

    app.get("/socket/:sessionID", { websocket: true }, async (connection, request) => {
        await NotificationController.onUpgrade(connection, request);
    });
};
