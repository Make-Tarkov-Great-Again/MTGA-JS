const { BaseModel } = require("./BaseModel");

class Item extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }
}

module.exports = Item;