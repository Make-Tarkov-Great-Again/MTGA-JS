const { BaseModel } = require("./BaseModel");

class Trader extends BaseModel {
    constructor() {
        super();
    }

    isRagfair() {
        return this.base._id === "ragfair";
    }
}

module.exports.Trader = Trader;