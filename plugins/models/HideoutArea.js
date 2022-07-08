const { BaseModel } = require("./BaseModel");

class HideoutArea extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports = HideoutArea;