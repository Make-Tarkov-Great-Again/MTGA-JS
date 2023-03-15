import { logger, stringify } from "../utilities/_index.mjs";
import { database } from "../../app.mjs";
import { Dialogues } from "./Dialogues.mjs";


export class Notification {
    /**
    * Send created message over WebSocket connection if open, or push to notification queue to send later
    * @param {{}} notification
    * @param {string} sessionID 
    */
    static async sendNotification(sessionID, notification) {

        const { webSocket } = database.core.connections;

        if ((webSocket[sessionID] !== undefined && webSocket[sessionID].socket.readyState === 1)) {
            const string = stringify(notification, true);
            webSocket[sessionID].socket.send(string);

            logger.info(`[Send Notification]: Notification Sent!`)
            return true;
        } else {
            if (await this.getMailFromMailbox(sessionID, notification)) {
                logger.warn("[Send Notification]: Existing notification will be sent when WebSocket is open again");
                return false;
            } else {
                await this.setMailbox(sessionID, notification);
                logger.warn("[Send Notification]: Created notification will be sent when WebSocket is open again");
                return false;
            }
        }
    }

    static async sendNotificationMessage(sessionID, dialogue) {
        // need to add notificationcls
        const notification = {
            type: "new_message",
            eventId: dialogue._id,
            dialogId: dialogue.uid,
            message: dialogue
        };
        await this.sendNotification(sessionID, notification);
    }

    /**
         * Get notification from queue array
         * @returns array
         */
    static async getMailbox(sessionID) {
        if (this.checkNotificationQueue(sessionID))
            return database.profiles[sessionID].storage.mailbox;
    }

    static async getMailFromMailbox(sessionID, message) {
        return database.profiles[sessionID].storage.mailbox.find(mail => mail.eventId === message.eventId);
    }

    static setMailbox(sessionID, message) {
        return database.profiles[sessionID].storage.mailbox.push(message)
    }

    /**
     * Check if their are notifications queued
     * @returns true/false
     */
    static checkNotificationQueue(sessionID) {
        return database.profiles[sessionID]?.storage?.mailbox?.length > 0;
    }

    /**
     * Remove notification from queue array
     * @returns 
     */
    static async removeNotificationFromQueue(sessionID) {
        return database.profiles[sessionID].storage.mailbox.splice(0, 1)[0]
    }

    static getInsuranceNotifications(sessionID) {
        return database.profiles[sessionID].storage.insurance;
    }

    static checkInsuranceNotifications(sessionID) {
        return database.profiles[sessionID]?.storage?.insurance?.length > 0;
    }

    static async removeInsuranceNotification(sessionID) {
        return database.profiles[sessionID].storage.insurance.splice(0, 1)[0]
    }

    /**
     * Push notification to queue array
     * @param {{}} message 
     * @returns 
     */
    static async addInsuranceNotificationToQueue(sessionID, message) {
        return database.profiles[sessionID].storage.insurance.push(message)
    }

    static async processMailbox(sessionID) {
        const notifications = await this.getMailbox(sessionID)
        if (notifications) {
            const currentTime = getCurrentTimestamp();

            for (let i = 0, length = notifications.length; i < length; i++) {
                const notification = notifications[i]
                if (currentTime >= notification.message.dt) {
                    if (await this.sendNotification(sessionID, notification))
                        await this.removeNotificationFromQueue(sessionID);
                }
            }
        }
    }

    static async processInsuranceReturn(sessionID) {
        if (this.checkInsuranceNotifications()) {
            const insurance = this.getInsuranceNotifications();
            const time = getCurrentTimestamp();

            for (let i = 0, length = insurance.length; i < length; i++) {
                const insured = insurance[i];

                if (time < insured.scheduledTime) continue;

                for (const items of insured.items) {
                    /**
                    * The higher the sell price, the lower the return chance
                    */
                    break;
                }

                if (insured.items.length === 0) {
                    const { dialogue: { insuranceFailed } } = await Trader.get(insurance.traderId);
                    insured.messageContent.templateId = getRandomFromArray(insuranceFailed);
                }

                const generatedDialogue = await Dialogues.generateTraderDialogue(insured.traderId, insured.messageContent, sessionID, insured.items);

                if (await this.sendNotificationMessage(sessionID, generatedDialogue)) {
                    await this.removeInsuranceNotification(sessionID);
                };
            }
        }
    }
}