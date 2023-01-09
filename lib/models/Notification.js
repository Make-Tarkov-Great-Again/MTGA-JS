const { logger, stringify } = require("../utilities");
const { BaseModel } = require("./BaseModel");
const { database: { core: { connections: { webSocket } } } } = require("../../app");



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
     * @param {{}} notification
     * @param {string} sessionID 
     */
    async sendNotification(notification, sessionID) {
        const { Profile } = require('./Profile');
        const playerProfile = await Profile.get(sessionID);

        if ((webSocket[sessionID] !== undefined && webSocket[sessionID].socket.readyState === 1)) {
            const string = stringify(notification, true);
            webSocket[sessionID].socket.send(string);

            await logger.success(`[Send Notification]: Notification Sent!`)
            return true;
        } else {
            const check = await playerProfile.getNotificationFromQueue(notification)
            if (check) {
                await logger.debug("[Send Notification]: Existing notification will be sent when WebSocket is open again");
                return false;
            } else {
                await playerProfile.addNotificationToQueue(notification);
                await logger.debug("[Send Notification]: Created notification will be sent when WebSocket is open again");
                return false;
            }
        }
    }


}
module.exports.Notification = Notification;
