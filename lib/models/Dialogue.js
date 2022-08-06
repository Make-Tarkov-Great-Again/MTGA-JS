const { BaseModel } = require("./BaseModel");

class Dialogue extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.Dialogue = Dialogue;