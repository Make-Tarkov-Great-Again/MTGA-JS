import { logger, stringify } from "../utilities/_index.mjs";
import { TaskerController } from "./TaskerController.mjs";

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

        const { connections: { webSocket, webSocketPings } } = database.core;


        const sessionID = request.params.sessionID;

        webSocket[sessionID] = connection;

        if (webSocketPings[sessionID]) {
            clearInterval(webSocketPings[sessionID]);
        }

        webSocketPings[sessionID] = setInterval(() => {
            if (webSocket[sessionID].socket.readyState === 1) {
                webSocket[sessionID].socket.send(
                    JSON.stringify(
                        {
                            type: "ping",
                            eventId: "ping"
                        }
                    )
                )
                logger.info(`[WebSocket] Pinged Player: ${sessionID}`);
            } else {
                logger.error(`[WebSocket] Ping to player ${sessionID} failed, clearing`);
                clearInterval(webSocketPings[sessionID]);
                delete webSocket[sessionID];
            }
        }, 90000)

        //await TaskerController.runTasks(sessionID);
    }
}