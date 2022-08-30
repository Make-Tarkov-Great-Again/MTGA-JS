const { FastifyResponse, logger, stringify } = require("../../utilities");

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
                    JSON.stringify(
                        {
                            type: "ping",
                            eventId: "ping"
                        }
                    )
                )
                logger.logSuccess(`[WebSocket] Pinged Player: ${sessionID}`);
            } else {
                logger.logError(`[WebSocket] Ping to player ${sessionID} failed, clearing`);
                clearInterval(webSocketPings[sessionID]);
                delete webSocket[sessionID];
            }
        }, 90000)
    }
}
module.exports.NotificationController = NotificationController;