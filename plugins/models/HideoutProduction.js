const { BaseModel } = require("./BaseModel");

class HideoutProduction extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.HideoutProduction = HideoutProduction;