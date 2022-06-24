const { baseModel } = require("./base");

class Profile extends baseModel {
    constructor() {
        super();
    }
}

module.exports.profile = Profile;