const fs = require('fs');
const logger = require('../utilities/logger');
const { generateUniqueId } = require(`../utilities/utility`);
const {
    readParsed,
    fileExist,
    stringify,
    writeFile,
    getDirectoriesFrom,
    createDirectory
} = require(`../utilities/fileIO`);


class Account {
    constructor() {
        this.accounts = {};
        this.accountFileAge = {};
    }

    /**
    * reloadAccountByLogin functions checks for changes in 
    * profile account data on user login and loads accounts on demand.
    * @param {object} info 
    * @returns user account ID
    */
    reloadAccountByLogin = async (info) => {
        /**
         * Read account files from cache that were already loaded by the second part of this function.
         * If the file was changed (for example, by another cluster member), 
         * the account file gets reloaded from disk.
         */
        for (const accountID in this.accounts) {
            const account = this.accounts[accountID];

            // Does the account information match any cached account?
            if (info.email === account.email && info.password === account.password) {
                // Check if the file was modified by another cluster member using the file age.
                const stats = fs.statSync(`./user/profiles/${accountID}/account.json`);
                if (stats.mtimeMs != this.accountFileAge[accountID]) {
                    logger.logWarning(`[CLUSTER] Account file for account ${accountID} was modified, reloading.`);
                    // Reload the account from disk.
                    this.accounts[accountID] = readParsed(`./user/profiles/${accountID}/account.json`);
                    // Reset the file age for this users account file.
                    this.accountFileAge[accountID] = stats.mtimeMs;
                }

                return accountID;
            }
        }

        /**
         * Read account files from disk for accounts that are not cached already.
         */
        const profileIDs = getDirectoriesFrom("./user/profiles/");
        for (const id in profileIDs) {
            if (!fileExist(`./user/profiles/${profileIDs[id]}/account.json`)) {
                logger.logWarning(`[CLUSTER] reloadAccountbyLogin - Account file for account ${profileIDs[id]} does not exist.`);
            } else {

                // Read all account files from disk as we need to compare the login data.
                const account = readParsed(`./user/profiles/${profileIDs[id]}/account.json`);
                if (info.email === account.email && info.password === account.password) {
                    // Read the file age for this users account file.
                    const stats = fs.statSync(`./user/profiles/${profileIDs[id]}/account.json`);

                    // Save the account to memory and set the accountFileAge variable.
                    this.accounts[profileIDs[id]] = account
                    this.accountFileAge[profileIDs[id]] = stats.mtimeMs;
                    logger.logSuccess(`[CLUSTER] User ${account.email} with ID ${profileIDs[id]} logged in successfully.`);

                    return profileIDs[id];
                }
            }
        }
        
        // If the account does not exist, this will allow the launcher to display an error message.
        return false;
    }

    /**
    * Reloads the account stored in memory for a specific session (aka. accountID), 
    * if the file was modified elsewhere.
    * @param {*} sessionID 
    */
    reloadAccountBySessionID = async (sessionID) => {
        if (!fileExist(`./user/profiles/${sessionID}/account.json`)) {
            logger.logWarning(`[CLUSTER] reloadAccountBySessionID - Account file for account ${sessionID} does not exist.`);
        } else {
            // Does the session exist?
            if (!this.accounts[sessionID]) {
                logger.logWarning(`[CLUSTER] Tried to load session ${sessionID} but it wasn't cached, loading.`);
                // Reload the account from disk.
                this.accounts[sessionID] = readParsed(`./user/profiles/${sessionID}/account.json`);
                // Set the file age for this users account file.
                const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
                this.accountFileAge[sessionID] = stats.mtimeMs;
            } else {
                // Check if the file was modified by another cluster member using the file age.
                const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
                if (stats.mtimeMs != this.accountFileAge[sessionID]) {
                    logger.logWarning(`[CLUSTER] Account file for account ${sessionID} was modified, reloading.`);

                    // Reload the account from disk.
                    this.accounts[sessionID] = readParsed(`./user/profiles/${sessionID}/account.json`);
                    // Reset the file age for this users account file.
                    this.accountFileAge[sessionID] = stats.mtimeMs;
                }
            }
        }
    }

    /**
    * If the sessionID is specified, this function will 
    * save the specified account file to disk,
    * if the file wasn't modified elsewhere and the current memory 
    * content differs from the content on disk.s
    * @param {*} sessionID 
    */
    saveToDisk = async (sessionID = 0) => {
        // Should all accounts be saved to disk?
        if (sessionID == 0) {
            // Iterate through all cached accounts.
            for (const id in this.accounts) {
                // Check if the file was modified by another cluster member using the file age.
                const stats = fs.statSync(`./user/profiles/${id}/account.json`);
                if (stats.mtimeMs == this.accountFileAge[id]) {

                    // Check if the memory content differs from the content on disk.
                    const currentAccount = this.accounts[id];
                    const savedAccount = readParsed(`./user/profiles/${id}/account.json`);
                    if (stringify(currentAccount) !== stringify(savedAccount)) {
                        // Save memory content to disk.
                        writeFile(`/user/profiles/${id}/account.json`, this.accounts[id]);

                        // Update file age to prevent another reload by this server.
                        const stats = fs.statSync(`./user/profiles/${id}/account.json`);
                        this.accountFileAge[id] = stats.mtimeMs;

                        logger.logSuccess(`[CLUSTER] Account file for account ${id} was saved to disk.`);
                    }
                } else {
                    logger.logWarning(`[CLUSTER] Account file for account ${id} was modified, reloading.`);

                    // Reload the account from disk.
                    this.accounts[id] = readParsed(`./user/profiles/${id}/account.json`);
                    // Reset the file age for this users account file.
                    this.accountFileAge[id] = stats.mtimeMs;
                }
            }
        } else {

            if (!fileExist(`./user/profiles/${sessionID}`)) {
                createDirectory(`./user/profiles/${sessionID}`);
            }
            // Does the account file exist? (Required for new accounts)
            if (!fileExist(`./user/profiles/${sessionID}/account.json`)) {
                // Save memory content to disk
                writeFile(`./user/profiles/${sessionID}/account.json`, stringify(this.accounts[sessionID]));

                // Update file age to prevent another reload by this server.
                const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
                this.accountFileAge[sessionID] = stats.mtimeMs;

                logger.logSuccess(`[CLUSTER] New account ${sessionID} registered and was saved to disk.`);
            } else {
                // Check if the file was modified by another cluster member using the file age.
                const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
                if (stats.mtimeMs == this.accountFileAge[sessionID]) {
                    // Check if the memory content differs from the content on disk.
                    const currentAccount = this.accounts[sessionID];
                    const savedAccount = readParsed(`./user/profiles/${sessionID}/account.json`);
                    if (stringify(currentAccount) !== stringify(savedAccount)) {
                        // Save memory content to disk
                        logger.logDebug(this.accounts[sessionID]);
                        writeFile(`./user/profiles/${sessionID}/account.json`, stringify(this.accounts[sessionID]));

                        // Update file age to prevent another reload by this server.
                        const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
                        this.accountFileAge[sessionID] = stats.mtimeMs;

                        logger.logSuccess(`[CLUSTER] Account file for account ${sessionID} was saved to disk.`);
                    }
                } else {
                    logger.logWarning(`[CLUSTER] Account file for account ${sessionID} was modified, reloading.`);

                    // Reload the account from disk.
                    this.accounts[sessionID] = readParsed(`./user/profiles/${sessionID}/account.json`);
                    // Reset the file age for this users account file.
                    this.accountFileAge[sessionID] = stats.mtimeMs;
                }
            }
        }
    }

    register = async (info) => {
        // Get existing account from memory or cache a new one.
        let accountID = await this.reloadAccountByLogin(info)
        if (accountID) {
            return accountID
        }

        logger.logDebug("[CLUSTER] Registering new account...")

        accountID = await generateUniqueId("AID");

        this.accounts[accountID] = {
            id: accountID,
            email: info.email,
            password: info.password,
            wipe: true,
            edition: info.edition,
        };

        await this.saveToDisk(accountID);
        return "";
    }

    /**
    * Check if the client has an account. 
    * This function will be used by the response "/client/game/start" and determine, 
    * if a new account will be created.
    * @param {*} sessionID 
    * @returns If the account exists.
    */
    clientHasAccount = async (sessionID) => {
        this.reloadAccountBySessionID(sessionID)
        const accounts = this.getList();
        for (const account in accounts) {
            if (account == sessionID) {
                if (!fileExist("/user/profiles/" + sessionID + "/character.json")) {
                    logger.logSuccess(`[CLUSTER] New account ${sessionID} logged in!`);
                }
                return true
            }
        }
        return false
    }

    /**
    * Retrieve every existing accounts from the disk
    */
    loadAccounts() {
        for (const profileID of getDirectoriesFrom('/user/profiles')) {
            if (fileExist("/user/profiles/" + profileID + "/account.json")) {
                this.accounts[profileID] = readParsed("/user/profiles/" + profileID + "/account.json");
            }
        }
    }

    /**
     * Return directory of account IDs
     * @returns {object} - Dict made of Accounts IDS & Accounts infos
     */
    getList = async () => {
        return this.accounts;
    }

    find = async (sessionID) => {
        logger.logInfo(`[CLUSTER] Account ${sessionID} requested.`);
        // This needs to be at the top to check for changed accounts.
        this.reloadAccountBySessionID(sessionID);
        for (const accountID in this.accounts) {
            const account = this.accounts[accountID];

            if (account.id === sessionID) {
                logger.logSuccess(`[CLUSTER] Account ${sessionID} found.`);
                return account;
            }
        }
        return undefined;
    }

    /**
     * Remove account from memory and disk
     * @param {*} info 
     * @returns 
     */
    remove(info) {
        const accountID = this.reloadAccountBySessionID(info);

        if (accountID !== "") {
            delete this.accounts[accountID];
            utility.removeDir(`user/profiles/${accountID}/`);
            //this.saveToDisk();
        }

        return accountID;
    }

    /**
     * Set new email for account
     * @param {*} info 
     * @returns 
     */
    changeEmail = async (info) => {
        logger.logWarning(`[CLUSTER] Changing email for account ${info.id}`);
        const accountID = this.reloadAccountBySessionID(info);

        if (accountID !== "") {
            this.accounts[accountID].email = info.change;
            this.saveToDisk(accountID);
            logger.logSuccess(`[CLUSTER] Changed email for account ${accountID}`);
        }

        return accountID;
    }

    /**
     * Set new password for account
     * @param {*} info 
     * @returns 
     */
    changePassword = async (info) => {
        logger.logWarning(`[CLUSTER] Changing password for account ${info.id}`);
        const accountID = this.reloadAccountBySessionID(info);

        if (accountID !== "") {
            this.accounts[accountID].password = info.change;
            this.saveToDisk(accountID);
            logger.logSuccess(`[CLUSTER] Password for account ${accountID} changed.`);
        }

        return accountID;
    }

    /**
     * Wipe account from memory and disk
     * @param {*} info 
     * @returns 
     */
    wipe = async (info) => {
        logger.logWarning(`[CLUSTER] Wiping account ${info.id}`);
        const accountID = this.reloadAccountBySessionID(info);

        if (accountID !== "") {
            this.accounts[accountID].edition = info.edition;
            this.setWipe(accountID, true);
            this.saveToDisk(accountID);
        }

        return accountID;
    }

    /**
     * Check wipe status
     * @param {*} sessionID 
     * @returns 
     */
    isWiped = async (sessionID) => {
        // This needs to be at the top to check for changed accounts.
        this.reloadAccountBySessionID(sessionID);
        return this.accounts[sessionID].wipe;
    }

    /**
     * Set wipe status
     * @param {*} sessionID 
     * @param {*} state 
     */
    setWipe = async (sessionID, state) => {
        // This needs to be at the top to check for changed accounts.
        this.reloadAccountBySessionID(sessionID);
        this.accounts[sessionID].wipe = state;
    }

    /**
     * Find matching account
     * @param {object} accounts - Dict made of Accounts IDS & Accounts infos
     * @param {object} loginInfos - username and password combo
     * @returns accountID or false
     */
    loginAccount = async (loginInfos) => {
        for (const [accountID, accountInfos] of Object.entries(this.accounts)) {
            if (accountInfos.login == loginInfos.login && accountInfos.password == loginInfos.password) {
                return accountID;
            }
        }

        return false;
    }

    /**
     * Retrieve all existing editions in server/db/profiles
     * @returns {Array} list of existing editions
     */
    getEditions = async (profiles) => {
        return Object.keys(profiles);
    }

    /**
     * Get tarkov path
     * @param {*} sessionID 
     * @param {*} state 
     */
    getTarkovPath = async (sessionID) => {
        if(sessionID == (null || undefined))
        {
            return false
        }

        // This needs to be at the top to check for changed accounts.
        await this.reloadAccountBySessionID(sessionID);
        if(this.accounts[sessionID].tarkovPath != (null || undefined))
        {
            logger.logDebug("[CLUSTER] Saved Tarkov Path for account " + sessionID);
            return this.accounts[sessionID].tarkovPath;
        } else {
            return false;
        }
    }

    setTarkovPath = async (sessionID, tarkovPath) => {
        if(sessionID == (null || undefined))
        {
            return false
        }

        // This needs to be at the top to check for changed accounts.
        await this.reloadAccountBySessionID(sessionID);
        this.accounts[sessionID].tarkovPath = tarkovPath;
        this.saveToDisk(sessionID);
    }
}

module.exports.Account = Account;