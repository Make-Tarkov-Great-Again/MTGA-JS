const { BaseModel } = require("./BaseModel");
const { Edition } = require("./Edition");
const { Profile } = require("./Profile");
//const { database: { fileAge } } = require("../../app");
/* const {
    logger,
    readParsed,
    fileExist,
    stringify,
    writeFile,
    createDirectory,
    getFileUpdatedDate
} = require("../utilities/index.mjs").default; */

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
        if (!fileAge[this.id]) {
            fileAge[this.id] = {};
        }

        if (!await fileExist(`./user/profiles/${this.id}`)) {
            await createDirectory(`./user/profiles/${this.id}`);
        }

        const accountPath = this.getAccountFilePath()
        // Does the account file exist? (Required for new accounts)
        if (!await fileExist(accountPath)) {
            // Save memory content to disk
            await writeFile(accountPath, stringify(await this.dissolve()));

            // Update file age to prevent another reload by this server.
            fileAge[this.id].account = await getFileUpdatedDate(accountPath);

            logger.info(`New account ${this.id} registered and was saved to disk.`);
        } else {
            // Check if the file was modified by another cluster member using the file age.
            const stats = await getFileUpdatedDate(accountPath);
            if (stats === fileAge[this.id].account) {
                // Check if the memory content differs from the content on disk.
                const savedAccount = await readParsed(accountPath);
                if (stringify(await this.dissolve()) !== stringify(savedAccount)) {
                    // Save memory content to disk
                    await writeFile(accountPath, stringify(await this.dissolve()));

                    // Update file age to prevent another reload by this server.
                    fileAge[this.id].account = stats;

                    logger.info(`[CLUSTER] Account file for account ${this.id} was saved to disk.`);
                }
            } else {
                logger.warn(`[CLUSTER] Account file for account ${this.id} was modified, reloading.`);
                // Change
                /* Reload the account from disk.
                this.accounts[this.id] = await readParsed(`./user/profiles/${this.id}/account.json`);
                Reset the file age for this users account file.*/
                fileAge[this.id].account = stats;
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
        logger.warn("Getting profile for account " + this.id);
        const profile = await Profile.get(this.id);
        return profile ? profile : false;
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
