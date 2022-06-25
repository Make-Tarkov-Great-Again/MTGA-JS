const { logger } = require("../utilities");
const { BaseModel } = require("./baseModel");

class Account extends BaseModel {
    constructor() {
        super();
    }

    /**
     * Return associated language
     * @returns 
     */
    getLanguage() {
        if (this.lang != (null || undefined || "")) {
            return this.lang;
        } else {
            this.lang = en;
            this.save()
            return this.lang;
        }
    }

    /**
     * Check if requested nickname is available
     * @param {*} nickname 
     * @returns 
     */
    async ifAvailableNickname(nickname) {
        const { database } = require("../../app");
        const collection = database.accounts;
        for (const [key, account] of Object.entries(collection)) {
            if (account.nickname === nickname) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get associated account profile
     * @returns 
     */
    async getProfile() {
        const { Profile } = require("./profile");
        logger.logDebug("Getting profile for account " + this.id);
        const profile = await Profile.get(this.id);
        if (profile) {
            return profile;
        }
        return false;
    }
}

module.exports.Account = Account;