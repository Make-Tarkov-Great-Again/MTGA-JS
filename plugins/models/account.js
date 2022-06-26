const { logger } = require("../utilities");
const { BaseModel } = require("./BaseModel");
const { Edition } = require("./Edition");
const fs = require('fs');
const {
    readParsed,
    fileExist,
    stringify,
    writeFile,
    createDirectory
} = require("../utilities");

class Account extends BaseModel {
    constructor(id) {
        super();

        /**
         * Creates a Database for this Model
         */
        this.createDatabase(id);
    }

    getAccountFilePath() {
        return `./user/profiles/${this.id}/account.json`;
    }

    async save() {
        const { database } = require("../../app");
        if(!database.fileAge[this.id]) {
            database.fileAge[this.id] = {};
        }

        if (!fileExist(`./user/profiles/${this.id}`)) {
            createDirectory(`./user/profiles/${this.id}`);
        }

        // Does the account file exist? (Required for new accounts)
        if (!fileExist(this.getAccountFilePath())) {
            // Save memory content to disk
            writeFile(this.getAccountFilePath(), stringify(await this.dissolve()));

            // Update file age to prevent another reload by this server.
            const stats = fs.statSync(this.getAccountFilePath());
            database.fileAge[this.id].account = stats.mtimeMs;

            logger.logSuccess(`New account ${this.id} registered and was saved to disk.`);
        } else {
            // Check if the file was modified by another cluster member using the file age.
            let stats = fs.statSync(this.getAccountFilePath());
            if (stats.mtimeMs === database.fileAge[this.id].account) {
                // Check if the memory content differs from the content on disk.
                const savedAccount = readParsed(this.getAccountFilePath());
                if (stringify(await this.dissolve()) !== stringify(savedAccount)) {
                    // Save memory content to disk
                    writeFile(this.getAccountFilePath(), stringify(await this.dissolve()));

                    // Update file age to prevent another reload by this server.
                    stats = fs.statSync(this.getAccountFilePath());
                    database.fileAge[this.id].account = stats.mtimeMs;

                    logger.logSuccess(`[CLUSTER] Account file for account ${this.id} was saved to disk.`);
                }
            } else {
                logger.logWarning(`[CLUSTER] Account file for account ${this.id} was modified, reloading.`);
                // Change
                    /* Reload the account from disk.
                    this.accounts[this.id] = readParsed(`./user/profiles/${this.id}/account.json`);
                    Reset the file age for this users account file.*/
                database.fileAge[this.id].account = stats.mtimeMs;
            }
        }
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
    static async ifAvailableNickname(nickname) {
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
        const { Profile } = require("./index");
        logger.logDebug("Getting profile for account " + this.id);
        const profile = await Profile.get(this.id);
        if (profile) {
            return profile;
        }
        return false;
    }

    /**
     * Create a reference to the edition instance in the variable this.edition
     */
    async solve() {
        this.edition = await Edition.get(this.edition);
    }

    /**
     * Dissolve the edition reference inside the editions variable and only return the instance ID.
     * @returns 
     */
    async dissolve() {
        let dissolve = await this.clone()
        dissolve.edition = dissolve.edition.id;
        return dissolve;
    }
}

module.exports.Account = Account;