const { logger, generateMongoID } = require("../../utilities");
const { BaseModel } = require("./BaseModel");


class ItemNode extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.ItemNode = ItemNode;
