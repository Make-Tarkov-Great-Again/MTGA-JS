const { BaseModel } = require("./BaseModel");

class Language extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.Language = Language;