const {
    read
} = require("../../utilities/fileIO");
const logger = require("../../utilities/logger");

class weblauncher {
    constructor() {
        this.baseDirectory = "./plugins/templates/weblauncher";
        logger.logDebug("[WEBLAUNCHER] Constructed.")
    }

    getBase() {
        logger.logDebug("[WEBLAUNCHER] Reading base file: " + this.baseDirectory + "/base.html");
        return read(this.baseDirectory + "/base.html");
    }

    display(content){
        logger.logDebug("[WEBLAUNCHER] Test display: " + content);
        let baseHTML = this.getBase();
        return String(baseHTML).replace("{{content}}", content);
    }
}

module.exports = new weblauncher();
