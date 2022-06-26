const { BaseModel } = require("./BaseModel");

class Quest extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.Quest = Quest;