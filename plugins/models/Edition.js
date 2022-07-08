const { BaseModel } = require("./BaseModel");

class Edition extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    getCharacterTemplateBySide(side) {
        if (side === "usec") {
            return this.usec;
        } else {
            return this.bear;
        }
    }
}

module.exports = Edition;