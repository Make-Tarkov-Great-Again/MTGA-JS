const { BaseModel } = require("./BaseModel");

class HideoutScavcase extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports = HideoutScavcase;