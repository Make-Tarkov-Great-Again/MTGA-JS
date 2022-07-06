const { BaseModel } = require("./BaseModel");

class Locale extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async getQuestLocales(questId) {
        return this.locale.quest[questId];
    }
}

module.exports.Locale = Locale;