const { logger } = require("../../utilities");
const { BaseModel } = require("./BaseModel");

class Notification extends BaseModel {
    constructor(id) {
        super(id);
        this.createDatabase(id);
    }

    /**
     * Create new notification for dialogue
     * @param {{}} message 
     * @returns {object}
     */
    async createNewNotification(message) {
        return {
            type: "new_message",
            eventId: message._id,
            dialogId: message.uid,
            message: message
        };
    }

    /**
     * Send created message over WebSocket connection if open, or push to notification queue to send later
     * @param {string} sessionID 
     * @param {{}} message 
     */
    async sendNotification(sessionID, message) {
        const { Profile } = require('./Profile');
        const { database: { core: { connections: { webSocket } } } } = require("../../app");

        if ((webSocket[sessionID] !== undefined && webSocket[sessionID].socket.readyState === 1)) {
            webSocket[sessionID].socket.send(JSON.stringify(message))
            logger.success(`[Send Notification]: Notification Sent!`)
            return true;
        } else {
            const playerProfile = await Profile.get(sessionID);
            const check = await playerProfile.getNotificationFromQueue(message)
            if (check) {
                logger.debug("[Send Notification]: Existing notification will be sent when WebSocket is open again");
                return false;
            }

            await playerProfile.addNotificationToQueue(message);
            logger.debug("[Send Notification]: Created notification will be sent when WebSocket is open again");
            return false;

        }
    }


}
module.exports.Notification = Notification;
