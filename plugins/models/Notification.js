const { BaseModel } = require("./BaseModel");

class Notification extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }

    async createNewNotification(message) {
        const newNotification = {
            type: "new_message",
            eventId: message._id,
            data: {
                dialogId: message.uid,
                message
            }
        };
        if (!this.queue) {
            this.queue = [];
        }
        this.queue.push(newNotification);
    }
}

module.exports.Notification = Notification;
