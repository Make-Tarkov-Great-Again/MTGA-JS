const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");

class Weapon extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.Weapon = Weapon;