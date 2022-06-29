const { BaseModel } = require("./BaseModel");

class Bot extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    static async generatePlayerScav(accountID) {
        // todo;
    }
}

module.exports.Bot = Bot;