'use strict'
const fs = require('fs');
const fastJson = require('fast-json-stringify');
const {
  readParsed,
  fileExist,
  stringify,
  writeFile,
  getDirectoriesFrom,
  createDirectory
} = require('../../utilities/fileIO');


class Account {
  constructor() {
    this.accounts = {};
    this.accountFileAge = {};
  }

  /**
   * Register a new account
   * @param {*} info 
   * @returns 
   */
  register(info) {
    // Get existing account from memory or cache a new one.
    let accountID = this.reloadAccountByLogin(info);
    if (accountID) {
      return accountID
    }

    accountID = AE.utility.generateUniqueId("AID", true);

    const accountSchema = fastJson({
      id: 'string',
      email: 'string',
      password: 'string',
      wipe: 'boolean',
      edition: 'string',
    })


    this.accounts[accountID] = accountSchema({
      id: accountID,
      email: info.email,
      password: info.password,
      wipe: true,
      edition: info.edition,
    });

    this.saveToDisk(accountID);
    return "";
  }

  /**
   * reloadAccountByLogin functions checks for changes in 
   * profile account data on user login and loads accounts on demand.
   * @param {object} info 
   * @returns user account ID
  */
  reloadAccountByLogin(info) {
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
          AE.server.log.info(`[CLUSTER] Account file for account ${accountID} was modified, reloading.`);
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
    const profileIDs = getDirectoriesFrom("/user/profiles/");
    for (const id in profileIDs) {
      if (!fileExist(`/user/profiles/${profileIDs[id]}/account.json`)) {
        AE.server.log.info(`[CLUSTER] Account file for account ${profileIDs[id]} does not exist.`);
      } else {

        // Read all account files from disk as we need to compare the login data.
        const account = readParsed(`/user/profiles/${profileIDs[id]}/account.json`);
        if (info.email === account.email && info.password === account.password) {
          // Read the file age for this users account file.
          const stats = fs.statSync(`./user/profiles/${profileIDs[id]}/account.json`);

          // Save the account to memory and set the accountFileAge variable.
          this.accounts[profileIDs[id]] = account
          this.accountFileAge[profileIDs[id]] = stats.mtimeMs;
          AE.server.log.info(`[CLUSTER] User ${account.email} with ID ${profileIDs[id]} logged in successfully.`);

          return profileIDs[id];
        }
      }
    }

    // If the account does not exist, this will allow the launcher to display an error message.
    return false;
  }

  /**
  * If the sessionID is specified, this function will 
  * save the specified account file to disk,
  * if the file wasn't modified elsewhere and the current memory 
  * content differs from the content on disk.
  * @param {*} sessionID 
  */
  saveToDisk(sessionID = 0) {
    // Should all accounts be saved to disk?
    if (sessionID == 0) {
      // Iterate through all cached accounts.
      for (const id in this.accounts) {
        // Check if the file was modified by another cluster member using the file age.
        const stats = fs.statSync(`../user/profiles/${id}/account.json`);
        if (stats.mtimeMs == this.accountFileAge[id]) {

          // Check if the memory content differs from the content on disk.
          const currentAccount = this.accounts[id];
          const savedAccount = readParsed(`/user/profiles/${id}/account.json`);
          if (stringify(currentAccount) !== stringify(savedAccount)) {
            // Save memory content to disk.
            writeFile(`/user/profiles/${id}/account.json`, this.accounts[id]);

            // Update file age to prevent another reload by this server.
            const stats = fs.statSync(`/user/profiles/${id}/account.json`);
            this.accountFileAge[id] = stats.mtimeMs;

            AE.server.log.info(`[CLUSTER] Account file for account ${id} was saved to disk.`);
          }
        } else {
          AE.server.log.info(`[CLUSTER] Account file for account ${id} was modified, reloading.`);

          // Reload the account from disk.
          this.accounts[id] = readParsed(`/user/profiles/${id}/account.json`);
          // Reset the file age for this users account file.
          this.accountFileAge[id] = stats.mtimeMs;
        }
      }
    } else {

      if (!fileExist(`/user/profiles/${sessionID}`)) {
        createDirectory(`/user/profiles/${sessionID}`);
      }
      // Does the account file exist? (Required for new accounts)
      if (!fileExist(`/user/profiles/${sessionID}/account.json`)) {
        // Save memory content to disk
        writeFile(`/user/profiles/${sessionID}/account.json`, stringify(this.accounts[sessionID]));

        // Update file age to prevent another reload by this server.
        const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
        this.accountFileAge[sessionID] = stats.mtimeMs;

        AE.server.log.info(`[CLUSTER] New account ${sessionID} registered and was saved to disk.`);
      } else {
        // Check if the file was modified by another cluster member using the file age.
        const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
        if (stats.mtimeMs == this.accountFileAge[sessionID]) {
          // Check if the memory content differs from the content on disk.
          const currentAccount = this.accounts[sessionID];
          const savedAccount = readParsed(`/user/profiles/${sessionID}/account.json`);
          if (stringify(currentAccount) !== stringify(savedAccount)) {
            // Save memory content to disk
            writeFile(`/user/profiles/${sessionID}/account.json`, this.accounts[sessionID]);

            // Update file age to prevent another reload by this server.
            const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
            this.accountFileAge[sessionID] = stats.mtimeMs;

            AE.server.log.info(`[CLUSTER] Account file for account ${sessionID} was saved to disk.`);
          }
        } else {
          AE.server.log.info(`[CLUSTER] Account file for account ${sessionID} was modified, reloading.`);

          // Reload the account from disk.
          this.accounts[sessionID] = readParsed(`/user/profiles/${sessionID}/account.json`);
          // Reset the file age for this users account file.
          this.accountFileAge[sessionID] = stats.mtimeMs;
        }
      }
    }
  }
}
module.exports = new Account();