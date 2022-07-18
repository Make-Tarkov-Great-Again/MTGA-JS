const { logger, generateItemId } = require("../utilities");
const { logError } = require("../utilities/logger");
const { BaseModel } = require("./BaseModel");

class Price extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }
}

module.exports.Price = Price;
