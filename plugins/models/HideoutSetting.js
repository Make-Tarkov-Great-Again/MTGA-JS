const { BaseModel } = require("./BaseModel");

class HideoutSetting extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }
}

module.exports.HideoutSetting = HideoutSetting;