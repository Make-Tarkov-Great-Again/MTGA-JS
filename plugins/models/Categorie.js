const { BaseModel } = require("./BaseModel");

class Categorie extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

}

module.exports.Categorie = Categorie;
