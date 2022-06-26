const { BaseModel } = require("./BaseModel");

class Locale extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.Locale = Locale;