const { BaseModel } = require("./BaseModel");

class Dialogue extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    static async createMessageContent(locale, type, time) {
        return {
            templateId: locale, //is description for whatever reason
            type: type, //start
            maxStorageTime: time * 3600
        };
    }
}

module.exports.Dialogue = Dialogue;