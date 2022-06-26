const { BaseModel } = require("./BaseModel");

class Trader extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    isRagfair() {
        return this.base._id === "ragfair";
    }
}

module.exports.Trader = Trader;