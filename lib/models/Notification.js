const { logger } = require("../../utilities");
const { BaseModel } = require("./BaseModel");

class Notification extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }

    async createNewNotification(message) {
        return {
            type: "new_message",
            eventId: message._id,
            dialogId: message.uid,
            message: message
        };
    }

    async sendNotification(sessionID, message) {
        const { database: { core: { connections: { webSocket } } } } = require("../../app");

        if (webSocket[sessionID].socket !== undefined && webSocket[sessionID].socket.readyState === 1) {
            logger.logDebug(`[Send Notification]: Sending Notification`)
            webSocket[sessionID].socket.send(JSON.stringify(message))
            logger.logSuccess(`[Send Notification]: Notification Sent!`)
        } else {
            logger.logError("Notification was not sent, shit!")
        }
    }
}
module.exports.Notification = Notification;
