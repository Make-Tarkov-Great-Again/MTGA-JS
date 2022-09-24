const { logger, stringify } = require("../../utilities");
const { TaskerController } = require("./TaskerController");


class NotificationController {
    constructor() {
        this.bundles = [];
    }

    /**
     * Upgrade notifier
     * @returns 
     */
    static async onUpgrade(connection, request) {
        const { database: { core: { connections:
            { webSocket, webSocketPings } } } } = require("../../app");
        const sessionID = request.params.sessionID;

        webSocket[sessionID] = connection;

        if (webSocketPings[sessionID]) {
            clearInterval(webSocketPings[sessionID]);
        }

        webSocketPings[sessionID] = setInterval(() => {
            if (webSocket[sessionID].socket.readyState === 1) {
                webSocket[sessionID].socket.send(
                    stringify(
                        {
                            type: "ping",
                            eventId: "ping"
                        }
                    )
                )
                logger.success(`[WebSocket] Pinged Player: ${sessionID}`);
            } else {
                logger.error(`[WebSocket] Ping to player ${sessionID} failed, clearing`);
                clearInterval(webSocketPings[sessionID]);
                delete webSocket[sessionID];
            }
        }, 90000)

        await TaskerController.runTasks(sessionID);
    }
}
module.exports.NotificationController = NotificationController;