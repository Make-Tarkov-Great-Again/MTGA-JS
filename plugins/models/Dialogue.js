const { BaseModel } = require("./BaseModel");
const fs = require('fs');
const { readParsed, fileExist, stringify, writeFile } = require("../utilities");

class Dialogue extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports = Dialogue;