const { BaseModel } = require("./BaseModel");
const { Dialogue } = require("./Dialogue");
const { Notification } = require("./Notification");
const { Trader } = require("./Trader");

const fs = require('fs/promises');
const {
    readParsedAsync, fileExist, logger, stringify,
    writeFile, getCurrentTimestamp, getRandomFromArray
} = require("../utilities");


class Profile extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
        this.id = id;
    }

    /**
     * Returns the last cyclic update timestamp. Returns false if the update didn't happen yet.
     * @returns {Promise<Number>}
     */
    async getLastCyclicUpdate() {
        if (typeof this.special.lastCyclicUpdate !== undefined) {
            return this.special.lastCyclicUpdate;
        } else {
            return false;
        }
    }

    /**
     * Sets the lastCyclicUpdate variable to the given BigInt input.
     * @param {BigInt} timestamp 
     */
    async setLastCyclicUpdate(timestamp) {
        this.special.lastCyclicUpdate = timestamp;
    }

    /**
     * Return the player character object
     * @returns {Promise<Object>}
     */
    async getPmc() {
        return this.character;
    }

    /**
     * Return the dialogues object
     * @returns {Promise<Object>}
     */
    async getDialogues() {
        return this.dialogues;
    }

    /**
     * Return the scav character object
     * @returns {Promise<Object>}
     */
    async getScav() {
        return this.scav;
    }

    /**
     * Return the special data object
     * @returns {Promise<Object>}
     */
    async getSpecialData() {
        return this.special;
    }

    /**
     * Return the path of the character.json file for this profile
     * @returns {Promise<String>}
     */
    async getCharacterPath() {
        return `./user/profiles/${this.id}/character.json`;
    }

    /**
     * Return the path of InsuredItems from character.json file for this profile
     * @returns {Promise<Array>}
     */
    async getInsuredItems() {
        return this.character.InsuredItems;
    }

    /**
     * Returns the path of Inventory items from character.json file for this profile
     * @returns 
     */
    async getInventoryItems() {
        return this.character.Inventory.items;
    }

    /**
     * Return the path of the storage.json file for this profile
     * @returns {Promise<String>}
     */
    async getStoragePath() {
        return `./user/profiles/${this.id}/storage.json`;
    }

    /**
     * Return the path of the dialogue.json file for this profile
     * @returns {Promise<String>}
     */
    async getDialoguePath() {
        return `./user/profiles/${this.id}/dialogue.json`;
    }

    /**
     * Return the path of the special.json file for this profile
     * @returns {Promise<String>}
     */
    async getSpecialDataPath() {
        return `./user/profiles/${this.id}/special.json`;
    }

    /**
     * Return the full storage object
     * @returns {Promise<Object>}
     */
    async getStorage() {
        return this.storage;
    }

    /**
     * Return the suites in storage
     * @returns {Promise<Array>}
     */
    async getStorageSuites() {
        return this.storage.suites;
    }

    /**
     * Return the builds in storage
     * @returns {Promise<Object>}
     */
    async getStorageBuilds() {
        return this.storage.builds;
    }

    /**
     * The tick function. Used to calculate periodic changes to player profiles.
     */
    async tick() {
        const currentTime = Date.now();
        let changesMade = false;
        const pmc = await this.getPmc();

        const specialData = await this.getSpecialData();
        if (typeof specialData.hideout === "undefined") {
            specialData.hideout = {};
        }

        const hideoutTick = await pmc.hideoutTick(specialData);
        if (hideoutTick) {
            changesMade = true;
        }

        await this.setLastCyclicUpdate(currentTime);
        if (changesMade) {
            await this.save();
        } else {
            await this.saveSpecial();
        }
    }

    /**
    * Check if requested nickname is available
    * @param {string} nickname
    * @returns {Promise<String>}
    */
    static async ifAvailableNickname(nickname) {
        const profiles = await Profile.getAllWithoutKeys();
        if (profiles.length === 0)
            return "ok";
        if (nickname.length < 3) 
            return "tooshort";
        for (const profile of profiles) {
            // This check needs to come first to see if profile is created, or it'll pop and error
            if (Object.keys(profile.character).length === 0) {
                logger.debug(`[PROFILE] Character for ${profile.id} has not been created.`);
                break;
            }
            if (profile.character.Info.Nickname === nickname) return "taken";
        }
        return "ok";
    }

    async getDissolvedDialogues() {
        const dissolvedCollection = {};
        for (const [id, dialogue] of Object.entries(this.dialogues)) {
            dissolvedCollection[id] = dialogue;
        }
        return dissolvedCollection;
    }

    async save() {
        await Promise.allSettled([
            this.saveCharacter(),
            this.saveStorage(),
            this.saveDialogue(),
            this.saveSpecial()
        ]);
        //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.reason}`)));

        // Add code to check for failure
        return true;
    }

    async saveCharacter() {
        const { database: { fileAge } } = require("../../app");
        const characterPath = await this.getCharacterPath();

        // Check if a PMC character exists in the server memory.
        if (this.character) {
            // Check if the profile path exists
            const currentProfile = stringify(await this.character.dissolve());
            if (await fileExist(characterPath)) {
                // Check if the file was modified elsewhere
                const statsPreSave = await fs.stat(characterPath);
                if (statsPreSave.mtimeMs === fileAge[this.id].character) {
                    // Compare the PMC character from server memory with the one saved on disk
                    const savedProfile = stringify(await readParsedAsync(characterPath));
                    if (currentProfile !== savedProfile) {
                        // Save the PMC character from memory to disk.
                       await writeFile(characterPath, currentProfile);
                        //logger.success(`[PROFILE] Character for AID ${this.id} was saved.`);
                    } else {
                        logger.warn(`[PROFILE] Skipped saving character for AID ${this.id}.`);
                        // Skip save ?
                    }
                } else {
                    logger.warn(`[PROFILE] Character for AID ${this.id} requires reload.`);
                    // Recreate reload
                }
            } else {
                //logger.success(`[PROFILE] Character for AID ${this.id} was saved in a newly created file.`);
                // Save the PMC character from memory to disk.
                await writeFile(characterPath, currentProfile);
            }
            // Update the savedFileAge stored in memory for the character.json.
            const statsAfterSave = await fs.stat(characterPath);
            fileAge[this.id].character = statsAfterSave.mtimeMs;
        } else {
            logger.error(`[PROFILE] Character for AID ${this.id} does not exist.`);
        }

    }

    async saveStorage() {
        const { database: { fileAge } } = require("../../app");

        const storagePath = await this.getStoragePath();
        // Check if a PMC character exists in the server memory.
        if (this.storage) {
            // Check if the profile path exists
            const currentStorage = stringify(await this.storage);
            if (await fileExist(storagePath)) {
                // Check if the file was modified elsewhere
                const statsPreSave = await fs.stat(storagePath);
                if (statsPreSave.mtimeMs === fileAge[this.id].storage) {
                    // Compare the PMC storage from server memory with the one saved on disk
                    const savedProfile = stringify(await readParsedAsync(storagePath));
                    if (currentStorage !== savedProfile) {
                        // Save the PMC storage from memory to disk.
                        await writeFile(storagePath, currentStorage);
                        logger.success(`[PROFILE] Storage for AID ${this.id} was saved.`);
                    } else {
                        // Skip save ?
                    }
                } else {
                    // Recreate reload
                }
            } else {
                // Save the PMC storage from memory to disk.
                await writeFile(storagePath, currentStorage);
            }
            // Update the savedFileAge stored in memory for the storage.json.
            let statsAfterSave = await fs.stat(storagePath);
            fileAge[this.id].storage = statsAfterSave.mtimeMs;
        }

    }

    async saveDialogue() {
        const { database: { fileAge } } = require("../../app");

        const dialoguePath = await this.getDialoguePath();
        const dissolvedDialogues = await this.getDissolvedDialogues();
        const currentDialogues = stringify(dissolvedDialogues);

        // Check if the dialogue file exists.
        if (await fileExist(dialoguePath)) {

            // Check if the file was modified elsewhere.
            const statsPreSave = await fs.stat(dialoguePath);
            if (statsPreSave.mtimeMs === fileAge[this.id].dialogues) {

                // Compare the dialogues from server memory with the ones saved on disk.
                const savedDialogues = stringify(await readParsedAsync(dialoguePath));
                if (currentDialogues !== savedDialogues) {
                    // Save the dialogues stored in memory to disk.
                    await writeFile(dialoguePath, currentDialogues);

                    // Reset the file age for the sessions dialogues.
                    const stats = await fs.stat(dialoguePath);
                    fileAge[this.id].dialogues = stats.mtimeMs;
                    logger.success(`[PROFILE] Dialogues for AID ${this.id} was saved.`);
                }
            } else {
                // Fix reloading dialogues
            }
        } else {
            // Save the dialogues stored in memory to disk.
           await writeFile(dialoguePath, currentDialogues);

            // Reset the file age for the sessions dialogues.
            const stats = await fs.stat(dialoguePath);
            fileAge[this.id].dialogues = stats.mtimeMs;
            logger.success(`[PROFILE] Dialogues for AID ${this.id} was created and saved.`);
        }
    }

    async saveSpecial() {
        const { database: { fileAge } } = require("../../app");
        const specialDataPath = await this.getSpecialDataPath();
        const currentSpecialData = stringify(this.special);

        // Check if the speical data file exists.
        if (await fileExist(specialDataPath)) {
            // Check if the file was modified elsewhere.
            const statsPreSave = await fs.stat(specialDataPath);
            if (statsPreSave.mtimeMs === fileAge[this.id].special) {

                // Compare the special from server memory with the ones saved on disk.
                const savedSpecialData = stringify(await readParsedAsync(specialDataPath));
                if (currentSpecialData !== savedSpecialData) {
                    // Save the special stored in memory to disk.
                   await writeFile(specialDataPath, currentSpecialData);

                    // Reset the file age for the sessions special data.
                    const stats = await fs.stat(specialDataPath);
                    fileAge[this.id].special = stats.mtimeMs;
                }
            } else {
                // Fix reloading special
            }
        } else {
            // Save the special stored in memory to disk.
            await writeFile(specialDataPath, currentSpecialData);

            // Reset the file age for the sessions special.
            const stats = await fs.stat(specialDataPath);
            fileAge[this.id].special = stats.mtimeMs;
        }
    }

    async getLoyalty(traderID) {
        const { base: { loyaltyLevels } } = await Trader.get(traderID);
        const pmcData = await this.getPmc();
        let playerSaleSum;
        let playerStanding;
        let playerLevel;
        if (pmcData.TradersInfo[traderID]) {
            playerSaleSum = pmcData.TradersInfo[traderID].salesSum;
            playerStanding = pmcData.TradersInfo[traderID].standing;
            playerLevel = pmcData.Info.Level;
        } else {
            playerSaleSum = 0;
            playerStanding = 0;
            playerLevel = pmcData.Info.Level;
        }
        let calculatedLoyalty = 0;
        if (traderID !== "ragfair") {
            // we check if player meet loyalty requirements
            for (const loyaltyLevel of loyaltyLevels) {
                if (playerSaleSum >= loyaltyLevel.minSalesSum &&
                    playerStanding >= loyaltyLevel.minStanding &&
                    playerLevel >= loyaltyLevel.minLevel) {
                    calculatedLoyalty++;
                } else if (calculatedLoyalty === 0)
                    calculatedLoyalty = 1;
                else
                    break;
            }
        } else
            return "ragfair";
        return (calculatedLoyalty - 1);
    }

    async sendNotificationMessage(dialogue, sessionID) {
        // need to add notificationcls
        let notificationHandler = await Notification.get(this.id);
        if (!notificationHandler) {
            notificationHandler = new Notification(this.id);
        }

        const notification = await notificationHandler.createNewNotification(dialogue);
        await notificationHandler.sendNotification(
            notification,
            sessionID
        );
    }

    /**
         * Get notification from queue array
         * @returns array
         */
    async getNotificationQueue() {
        return this.storage.mailbox;
    }

    async getNotificationFromQueue(message) {
        return this.storage.mailbox.find(mail => mail.eventId === message.eventId);
    }

    async addNotificationToQueue(message) {
        return this.storage.mailbox.push(message)
    }

    /**
     * Check if their are notifications queued
     * @returns true/false
     */
    async checkNotificationQueue() {
        return this?.storage?.mailbox?.length > 0;
    }

    /**
     * Remove notification from queue array
     * @returns 
     */
    async removeNotificationFromQueue() {
        return this.storage.mailbox.splice(0, 1)[0]
    }

    async getInsuranceNotifications() {
        return this.storage.insurance;
    }

    async checkInsuranceNotifications() {
        return this?.storage?.insurance?.length > 0;
    }

    async removeInsuranceNotification() {
        return this.storage.insurance.splice(0, 1)[0]
    }

    /**
     * Push notification to queue array
     * @param {{}} message 
     * @returns 
     */
    async addInsuranceNotificationToQueue(message) {
        return this.storage.insurance.push(message)
    }

    async processMailbox() {
        const check = await this.checkNotificationQueue()
        const time = await getCurrentTimestamp()
        if (check) {
            const notifications = await this.getNotificationQueue()

            let notificationHandler = await Notification.get(this.id);
            if (!notificationHandler) notificationHandler = new Notification(this.id);

            for (const notification of notifications) {
                if (time >= notification.message.dt) {
                    const check = await notificationHandler.sendNotification(notification, this.id);
                    if (check) await this.removeNotificationFromQueue();
                }
            }
        }
    }

    async processInsuranceReturn() {
        const check = await this.checkInsuranceNotifications()
        if (check) {
            const insurance = await this.getInsuranceNotifications();
            const time = await getCurrentTimestamp();

            for (const insured of insurance) {
                if (time < insured.scheduledTime) continue;

                for (const items of insured.items) {
                    /**
                    * The higher the sell price, the lower the return chance
                    */
                    break;
                }

                if (insured.items.length === 0) {
                    const { dialogue: { insuranceFailed } } = await Trader.get(insurance.traderId);
                    insured.messageContent.templateId = await getRandomFromArray(insuranceFailed);
                }

                const dialogue = await Dialogue.get(this.id);
                const generatedDialogue = await dialogue.generateTraderDialogue(insured.traderId, insured.messageContent, this.id, insured.items);

                if (await this.sendNotificationMessage(generatedDialogue, this.id)) {
                    await this.removeInsuranceNotification();
                };
            }
        }
    }

    async getBackendCounters() {
        return this.character.BackendCounters;
    }

    async getBackendCounter(conditionId) {
        return this.character.BackendCounters[conditionId];
    }

    /**
     * Update values of existing backend counters, or create and add new backend counter
     * @param {string} conditionId 
     * @param {string} qid 
     * @param {int} counter 
     * @returns 
     */
    async updateBackendCounters(conditionId, qid, counter) {
        const backend = await this.getBackendCounter(conditionId)
        if (backend) {
            backend.value += counter;
            return;
        }

        this.character.BackendCounters[conditionId] = {
            "id": conditionId,
            "qid": qid,
            "value": counter
        }
        await this.saveCharacter();
    }

    async addCustomization(id) {
        this.storage.suites.push(id);
    }

    async getQuestStatus(questID) {
        for (const quest of this.character.Quests) {
            if (quest.qid === questID) {
                return quest.status;
            }
        }
        return "Locked";
    }

    async getProfileChangesBase() {
        const profileChangesBase = {
            warnings: [],
            profileChanges: {}
        };

        profileChangesBase.profileChanges[this.character._id] = {
            _id: this.character._id,
            experience: await this.character.getExperience(),
            quests: [], // are those current accepted quests ?? -- seems like thoose are completed/failed quests -Nehax
            repeatableQuests: [],
            ragFairOffers: [], // are those current ragfair requests ?
            builds: [], // are those current weapon builds ??
            items: {},
            production: null,
            skills: {
                Common: this.character.Skills.Common,
                Mastering: [],
                Points: 0

            },
            traderRelations: [] //_profile.TradersInfo
        };
        return profileChangesBase;
    }

    async getProfileChangesResponse(profileChanges, outputData) {
        if (!profileChanges) {
            return false;
        }
        const mergedData = Object.assign({}, outputData.profileChanges[this.character._id], profileChanges);
        outputData.profileChanges[this.character._id] = mergedData;
    }

}

module.exports.Profile = Profile;
