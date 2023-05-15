import { NotificationController } from "../controllers/_index.mjs";
import { Response } from "../classes/_index.mjs";


export default async function notifierRoutes(app, _opt) {

    // Client Notifier Routes //
    app.post("/client/WebSocketAddress", async (request, reply) => {
        return Response.zlibReply(
            reply,
            Response.getWebSocketUrl(Response.getSessionID(request))
        );
    });

    app.post("/client/notifier/channel/create", async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(
                Response.getNotifier(
                    Response.getSessionID(request)
                )
            )
        );
    });

    app.get("/socket/:sessionID", { websocket: true }, async (connection, request) => {
        await NotificationController.onUpgrade(connection, request);
    });
};
