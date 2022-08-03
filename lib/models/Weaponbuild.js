const { BaseModel } = require("./BaseModel");
const {
    readParsed,
    fileExist,
    stringify,
    writeFile
} = require("../../utilities");



class Weaponbuild extends BaseModel {
    constructor(id) {
        super();
        this.id = id;
    }

    async save() {
        if (!fileExist(`./user/profiles/${this.id}/userbuilds.json`)) {
            writeFile(`./user/profiles/${this.id}/userbuilds.json`, stringify({}));
        }
    }
}

module.exports.Weaponbuild = Weaponbuild;
