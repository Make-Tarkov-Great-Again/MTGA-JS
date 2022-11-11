const { BaseModel } = require("./BaseModel");
const { Edition } = require("./Edition");
const { Profile } = require("./Profile");
const fs = require('fs/promises');
const {
    logger,
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
        const { database: { fileAge } } = require("../../app");
        if (!fileAge[this.id]) {
            fileAge[this.id] = {};
        }

        if (!await fileExist(`./user/profiles/${this.id}`)) {
            await createDirectory(`./user/profiles/${this.id}`);
        }

        // Does the account file exist? (Required for new accounts)
        if (!await fileExist(this.getAccountFilePath())) {
            // Save memory content to disk
            await writeFile(this.getAccountFilePath(), stringify(await this.dissolve()));

            // Update file age to prevent another reload by this server.
            const stats = await fs.stat(this.getAccountFilePath());
            fileAge[this.id].account = stats.mtimeMs;

            await logger.success(`New account ${this.id} registered and was saved to disk.`);
        } else {
            // Check if the file was modified by another cluster member using the file age.
            let stats = await fs.stat(this.getAccountFilePath());
            if (stats.mtimeMs === fileAge[this.id].account) {
                // Check if the memory content differs from the content on disk.
                const savedAccount = await readParsed(this.getAccountFilePath());
                if (stringify(await this.dissolve()) !== stringify(savedAccount)) {
                    // Save memory content to disk
                    await writeFile(this.getAccountFilePath(), stringify(await this.dissolve()));

                    // Update file age to prevent another reload by this server.
                    stats = await fs.stat(this.getAccountFilePath());
                    fileAge[this.id].account = stats.mtimeMs;

                    await logger.success(`[CLUSTER] Account file for account ${this.id} was saved to disk.`);
                }
            } else {
                await logger.warn(`[CLUSTER] Account file for account ${this.id} was modified, reloading.`);
                // Change
                /* Reload the account from disk.
                this.accounts[this.id] = await readParsed(`./user/profiles/${this.id}/account.json`);
                Reset the file age for this users account file.*/
                fileAge[this.id].account = stats.mtimeMs;
            }
        }
    }

    /**
     * Return associated language
     * @returns {string}
     */
    getLanguage() {
        if (this.lang !== (null || undefined || "")) {
            return this.lang;
        } else {
            this.lang = "en";
            this.save();
            return this.lang;
        }
    }

    /**
     * Get associated account profile
     * @returns
     */
    async getProfile() {
        await logger.debug("Getting profile for account " + this.id);
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
        const dissolve = await this.clone();
        dissolve.edition = dissolve.edition.id;
        return dissolve;
    }
}

module.exports.Account = Account;
