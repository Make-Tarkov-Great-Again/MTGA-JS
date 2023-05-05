import { logger } from "../utilities/_index.mjs";
import { database } from "../../app.mjs";


export class NotificationController {
    constructor() {
        this.bundles = [];
    }

    /**
     * Upgrade notifier
     * @returns 
     */
    static async onUpgrade(connection, request) {
        const { webSocket, webSocketPings } = database.core.connections;

        const sessionID = request.params.sessionID;
        webSocket[sessionID] = connection;

        if (webSocketPings[sessionID]) clearInterval(webSocketPings[sessionID]);

        webSocketPings[sessionID] = setInterval(() => {
            const socket = webSocket[sessionID].socket;
            if (socket.readyState === socket.OPEN) {
                const payload = JSON.stringify({
                    type: "ping",
                    eventId: "ping"
                });
                socket.send(payload);
                logger.info(`[WebSocket] Pinged Player: ${sessionID}`);
            } else {
                clearInterval(webSocketPings[sessionID]);
                delete webSocket[sessionID];
                logger.error(`[WebSocket] Ping to player ${sessionID} failed, clearing`);
            }
        }, 90000);

        //await TaskerController.runTasks(sessionID);
    }

}