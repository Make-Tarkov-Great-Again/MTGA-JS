const { logger } = require("../utilities/index.mjs").default;
const { BaseModel } = require("./BaseModel");

class HideoutArea extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    static async getAreaByType(type) {
        this.find(area => area.Type === type);
    }

    async setActive(state) {
        if (typeof state !== "boolean") {
            logger.error(`[HideoutArea] Unable to set active state for hideout area ${this.type}, state input is not a boolean type`);
            return false;
        }

        this.active = state;
        return true;
    }

    async isActive() {
        return this.active;
    }

    async toggleActive() {
        if (this.active) {
            this.active = false;
        } else {
            this.active = true;
        }

        return this.active;
    }
}

module.exports.HideoutArea = HideoutArea;