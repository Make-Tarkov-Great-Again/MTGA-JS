const { logger } = require("../../utilities");
const { BaseModel } = require("./BaseModel");

class Notification extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
        this.queue = [];
    }

    /**
     * Get notification from queue array
     * @returns array
     */
    async getNotificationQueue() {
        return this.queue;
    }

    /**
     * Check if their are notifications queued
     * @returns true/false
     */
    async checkNotificationQueue() {
        return this.queue.length > 0;
    }

    /**
     * Remove notification from queue array
     * @returns 
     */
    async removeNotificationFromQueue() {
        return this.queue.splice(0, 1)[0]
    }

    /**
     * Push notification to queue array
     * @param {{}} message 
     * @returns 
     */
    async addNotificationToQueue(message) {
        return this.queue.push(message)
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
        const { database: { core: { connections: { webSocket } } } } = require("../../app");

        if ((webSocket[sessionID] !== undefined && webSocket[sessionID].socket.readyState === 1)) {
            webSocket[sessionID].socket.send(JSON.stringify(message))

            logger.success(`[Send Notification]: Notification Sent!`)
        } else {
            this.addNotificationToQueue(message)
            logger.error("Notification was not sent, shit!")
        }
    }

    
}
module.exports.Notification = Notification;
