const { BaseModel } = require("./BaseModel");

class Edition extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    getCharacterTemplateBySide(side) {
        return side === "usec" ? this.usec : this.bear;
    }
}

module.exports.Edition = Edition;