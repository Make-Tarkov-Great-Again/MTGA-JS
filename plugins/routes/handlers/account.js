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
} = require('./../../utilities/fileIO');
const { logger, utility } = require('./../../../app');



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
              const stats = fs.statSync(process.cwd() + `/user/profiles/${accountID}/account.json`);
              if (stats.mtimeMs != this.accountFileAge[accountID]) {
                  logger.logWarning(`[CLUSTER] Account file for account ${accountID} was modified, reloading.`);
                  // Reload the account from disk.
                  this.accounts[accountID] = JSON.parse(fs.readFileSync(process.cwd() + `/user/profiles/${accountID}/account.json`));
                  // Reset the file age for this users account file.
                  this.accountFileAge[accountID] = stats.mtimeMs;
              }

              return accountID;
          }
      }

      /**
       * Read account files from disk for accounts that are not cached already.
       */
      const profileIDs = getDirectoriesFrom(process.cwd() + `/user/profiles/`);
      for (const id in profileIDs) {
          if (!fs.existsSync(process.cwd() + `/user/profiles/${profileIDs[id]}/account.json`)) {
              logger.logWarning(`[CLUSTER] Account file for account ${profileIDs[id]} does not exist.`);
          } else {

              // Read all account files from disk as we need to compare the login data.
              const account = JSON.parse(fs.readFileSync(process.cwd() + `/user/profiles/${profileIDs[id]}/account.json`));
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
  reloadAccountBySessionID(sessionID) {
      if (!fs.existsSync(process.cwd() + `/user/profiles/${sessionID}/account.json`)) {
          logger.logWarning(`[CLUSTER] Account file for account ${sessionID} does not exist.`);
      } else {
          // Does the session exist?
          if (!this.accounts[sessionID]) {
              logger.logWarning(`[CLUSTER] Tried to load session ${sessionID} but it wasn't cached, loading.`);
              // Reload the account from disk.
              this.accounts[sessionID] = JSON.parse(fs.readFileSync(process.cwd() + `/user/profiles/${sessionID}/account.json`));
              // Set the file age for this users account file.
              const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
              this.accountFileAge[sessionID] = stats.mtimeMs;
          } else {
              // Check if the file was modified by another cluster member using the file age.
              const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
              if (stats.mtimeMs != this.accountFileAge[sessionID]) {
                  logger.logWarning(`[CLUSTER] Account file for account ${sessionID} was modified, reloading.`);

                  // Reload the account from disk.
                  this.accounts[sessionID] = JSON.parse(fs.readFileSync(process.cwd() + `/user/profiles/${sessionID}/account.json`));
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
                  const savedAccount = JSON.parse(fs.readFileSync(process.cwd() + `/user/profiles/${id}/account.json`));
                  if (JSON.stringify(currentAccount) !== JSON.stringify(savedAccount)) {
                      // Save memory content to disk.
                      fs.writeFileSync(process.cwd() + `/user/profiles/${id}/account.json`, this.accounts[id], {encoding: "utf8", flag: "w+"});

                      // Update file age to prevent another reload by this server.
                      const stats = fs.statSync(`/user/profiles/${id}/account.json`);
                      this.accountFileAge[id] = stats.mtimeMs;

                      logger.logSuccess(`[CLUSTER] Account file for account ${id} was saved to disk.`);
                  }
              } else {
                  logger.logWarning(`[CLUSTER] Account file for account ${id} was modified, reloading.`);

                  // Reload the account from disk.
                  this.accounts[id] = JSON.parse(fs.readFileSync(process.cwd() + `/user/profiles/${id}/account.json`));
                  // Reset the file age for this users account file.
                  this.accountFileAge[id] = stats.mtimeMs;
              }
          }
      } else {

          if (!fs.existsSync(process.cwd() + `/user/profiles/${sessionID}`)) {
              fs.mkdirSync(process.cwd() + `/user/profiles/${sessionID}`);
          }
          // Does the account file exist? (Required for new accounts)
          if (!fs.existsSync(process.cwd() + `/user/profiles/${sessionID}/account.json`)) {
              // Save memory content to disk
              fs.writeFileSync(process.cwd() + `/user/profiles/${sessionID}/account.json`, JSON.stringify(this.accounts[sessionID]), {encoding: "utf8", flag: "w+"});

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
                  const savedAccount = JSON.parse(fs.readFileSync(process.cwd() + `/user/profiles/${sessionID}/account.json`));
                  if (JSON.stringify(currentAccount) !== JSON.stringify(savedAccount)) {
                      // Save memory content to disk
                      fs.writeFileSync(process.cwd() + `/user/profiles/${sessionID}/account.json`, this.accounts[sessionID], {encoding: "utf8", flag: "w+"});

                      // Update file age to prevent another reload by this server.
                      const stats = fs.statSync(`./user/profiles/${sessionID}/account.json`);
                      this.accountFileAge[sessionID] = stats.mtimeMs;

                      logger.logSuccess(`[CLUSTER] Account file for account ${sessionID} was saved to disk.`);
                  }
              } else {
                  logger.logWarning(`[CLUSTER] Account file for account ${sessionID} was modified, reloading.`);

                  // Reload the account from disk.
                  this.accounts[sessionID] = JSON.parse(fs.readFileSync(process.cwd() + `/user/profiles/${sessionID}/account.json`));
                  // Reset the file age for this users account file.
                  this.accountFileAge[sessionID] = stats.mtimeMs;
              }
          }
      }
  }

  register(info) {
      // Get existing account from memory or cache a new one.
      let accountID = this.reloadAccountByLogin(info)
      if (accountID) {
          return accountID
      }

      accountID = tools.generateUniqueId("AID", true);

      console.log("accountController.js has: ", info)

      this.accounts[accountID] = {
          id: accountID,
          email: info.email,
          password: info.password,
          wipe: true,
          edition: info.edition,
      };

      this.saveToDisk(accountID);
      return "";
  }

  /**
   * Check if the client has an account. 
   * This function will be used by the response "/client/game/start" and determine, 
   * if a new account will be created.
   * @param {*} sessionID 
   * @returns If the account exists.
   */
  clientHasAccount(sessionID) {
      this.reloadAccountBySessionID(sessionID)
      const accounts = this.getList();
      for (const account in accounts) {
          if (account == sessionID) {
              if (!fs.existsSync(process.cwd() + "/user/profiles/" + sessionID + "/character.json")) {
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
          if (fs.existsSync(process.cwd() + "/user/profiles/" + profileID + "/account.json")) {
              this.accounts[profileID] = JSON.parse(fs.readFileSync(process.cwd() + "/user/profiles/" + profileID + "/account.json"));
          }
      }
  }

  /**
   * Return directory of account IDs
   * @returns {object} - Dict made of Accounts IDS & Accounts infos
   */
  getList() {
      return this.accounts;
  }

  find(sessionID) {
      // This needs to be at the top to check for changed accounts.
      this.reloadAccountBySessionID(sessionID);
      for (const accountID in this.accounts) {
          const account = this.accounts[accountID];

          if (account.id === sessionID) {
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
  changeEmail(info) {
      const accountID = this.reloadAccountBySessionID(info);

      if (accountID !== "") {
          this.accounts[accountID].email = info.change;
          this.saveToDisk(accountID);
      }

      return accountID;
  }

  /**
   * Set new password for account
   * @param {*} info 
   * @returns 
   */
  changePassword(info) {
      const accountID = this.reloadAccountBySessionID(info);

      if (accountID !== "") {
          this.accounts[accountID].password = info.change;
          this.saveToDisk(accountID);
      }

      return accountID;
  }

  /**
   * Wipe account from memory and disk
   * @param {*} info 
   * @returns 
   */
  wipe(info) {
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
  isWiped(sessionID) {
      // This needs to be at the top to check for changed accounts.
      this.reloadAccountBySessionID(sessionID);
      return this.accounts[sessionID].wipe;
  }

  /**
   * Set wipe status
   * @param {*} sessionID 
   * @param {*} state 
   */
  setWipe(sessionID, state) {
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
  loginAccount(loginInfos) {
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
  getEditions(database) {
      return Object.keys(database.profiles);
  }

}

module.exports.Account = Account;