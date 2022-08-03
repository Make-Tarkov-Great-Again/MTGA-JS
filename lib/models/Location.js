const { logger } = require("../../utilities");
const { BaseModel } = require("./BaseModel");

class Location extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.Location = Location;