const { BaseModel } = require("./BaseModel");

class Customization extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.Customization = Customization;