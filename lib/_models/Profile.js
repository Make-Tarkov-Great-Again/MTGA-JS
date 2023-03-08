const { BaseModel } = require("./BaseModel");
const { Dialogue } = require("./Dialogue");
const { Notification } = require("./Notification");
const { Trader } = require("./Trader");
//const { database: { fileAge } } = require("../../app");

/* const {
    readParsed, fileExist, logger, stringify,
    writeFile, getCurrentTimestamp, getRandomFromArray, getFileUpdatedDate, repair
} = require("../utilities/index.mjs").default; */


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
        return typeof this.special.lastCyclicUpdate !== "undefined"
            ? this.special.lastCyclicUpdate
            : false;
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
        const currentTime = getCurrentTimestamp();
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
/*     static async ifAvailableNickname(nickname) {
        const profiles = await Profile.getAllWithoutKeys();
        if (profiles.length === 0)
            return "ok";
        if (nickname.length < 3)
            return "tooshort";
        for (const profile of profiles) {
            // This check needs to come first to see if profile is created, or it'll pop and error
            if (Object.keys(profile.character).length === 0) {
                logger.warn(`[PROFILE] Character for ${profile.id} has not been created.`);
                break;
            }
            if (profile.character.Info.Nickname === nickname) return "taken";
        }
        return "ok";
    } */

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
    }

    async saveCharacter() {
        const characterPath = await this.getCharacterPath();

        // Check if a PMC character exists in the server memory.
        if (this.character) {
            // Check if the profile path exists
            let currentProfile = stringify(await this.character.dissolve());
            if (await fileExist(characterPath)) {
                // Check if the file was modified elsewhere
                const statsPreSave = await getFileUpdatedDate(characterPath);
                if (statsPreSave === fileAge[this.id].character) {
                    // Compare the PMC character from server memory with the one saved on disk
                    const savedProfile = stringify(await readParsed(characterPath));
                    if (currentProfile !== savedProfile) {
                        // Save the PMC character from memory to disk.
                        await writeFile(characterPath, currentProfile);
                        logger.info(`[PROFILE] Character for AID ${this.id} was saved.`);
                    } else {
                        logger.warn(`[PROFILE] Skipped saving character for AID ${this.id}.`);
                        // Skip save ?
                    }
                } else {
                    logger.warn(`[PROFILE] Character for AID ${this.id} requires reload.`);
                    // Recreate reload
                    this.character = await readParsed(characterPath);
                    this.character.solve();
                }
            } else {
                //logger.info(`[PROFILE] Character for AID ${this.id} was saved in a newly created file.`);
                // Save the PMC character from memory to disk.
                await writeFile(characterPath, currentProfile);
            }
            // Update the savedFileAge stored in memory for the character.json.
            fileAge[this.id].character = await getFileUpdatedDate(characterPath);
        } else {
            logger.error(`[PROFILE] Character for AID ${this.id} does not exist.`);
        }

    }

    async saveStorage() {

        const storagePath = await this.getStoragePath();
        // Check if a PMC character exists in the server memory.
        if (this.storage) {
            // Check if the profile path exists
            let currentStorage = stringify(await this.storage);
            if (await fileExist(storagePath)) {
                // Check if the file was modified elsewhere
                const statsPreSave = await getFileUpdatedDate(storagePath);
                if (statsPreSave === fileAge[this.id].storage) {
                    // Compare the PMC storage from server memory with the one saved on disk
                    const savedProfile = stringify(await readParsed(storagePath));
                    if (currentStorage !== savedProfile) {
                        // Save the PMC storage from memory to disk.
                        await writeFile(storagePath, currentStorage);
                        logger.info(`[PROFILE] Storage for AID ${this.id} was saved.`);
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
            fileAge[this.id].storage = await getFileUpdatedDate(storagePath);
        }

    }

    async saveDialogue() {

        const dialoguePath = await this.getDialoguePath();
        const dissolvedDialogues = await this.getDissolvedDialogues();
        let currentDialogues = stringify(dissolvedDialogues);

        // Check if the dialogue file exists.
        if (await fileExist(dialoguePath)) {

            // Check if the file was modified elsewhere.
            const statsPreSave = await getFileUpdatedDate(dialoguePath);
            if (statsPreSave === fileAge[this.id].dialogues) {

                // Compare the dialogues from server memory with the ones saved on disk.
                const savedDialogues = stringify(await readParsed(dialoguePath));
                if (currentDialogues !== savedDialogues) {
                    // Save the dialogues stored in memory to disk.
                    await writeFile(dialoguePath, currentDialogues);

                    // Reset the file age for the sessions dialogues.
                    fileAge[this.id].dialogues = await getFileUpdatedDate(dialoguePath);
                    logger.info(`[PROFILE] Dialogues for AID ${this.id} was saved.`);
                }
            } else {
                // Fix reloading dialogues
            }
        } else {
            // Save the dialogues stored in memory to disk.
            await writeFile(dialoguePath, currentDialogues);

            // Reset the file age for the sessions dialogues.
            fileAge[this.id].dialogues = await getFileUpdatedDate(dialoguePath);
            logger.info(`[PROFILE] Dialogues for AID ${this.id} was created and saved.`);
        }
    }

    async saveSpecial() {
        const specialDataPath = await this.getSpecialDataPath();
        let currentSpecialData = stringify(this.special);

        // Check if the speical data file exists.
        if (await fileExist(specialDataPath)) {
            // Check if the file was modified elsewhere.
            const statsPreSave = await getFileUpdatedDate(specialDataPath);
            if (statsPreSave === fileAge[this.id].special) {

                // Compare the special from server memory with the ones saved on disk.
                const savedSpecialData = stringify(await readParsed(specialDataPath));
                if (currentSpecialData !== savedSpecialData) {
                    // Save the special stored in memory to disk.
                    await writeFile(specialDataPath, currentSpecialData);

                    // Reset the file age for the sessions special data.
                    fileAge[this.id].special = await getFileUpdatedDate(specialDataPath);
                }
            } else {
                // Fix reloading special
            }
        } else {
            // Save the special stored in memory to disk.
            await writeFile(specialDataPath, currentSpecialData);

            // Reset the file age for the sessions special.
            fileAge[this.id].special = await getFileUpdatedDate(specialDataPath);
        }
    }

    async getLoyalty(traderID) {
        const { base: { loyaltyLevels } } = await Trader.get(traderID);
        const pmcData = await this.getPmc();

        const playerSaleSum = pmcData.TradersInfo[traderID]
            ? pmcData.TradersInfo[traderID].salesSum
            : 0;

        const playerStanding = pmcData.TradersInfo[traderID]
            ? pmcData.TradersInfo[traderID].standing
            : 0;

        const playerLevel = pmcData.Info.Level;

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
        const time = getCurrentTimestamp()
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
            const time = getCurrentTimestamp();

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
                    insured.messageContent.templateId = getRandomFromArray(insuranceFailed);
                }

                const dialogue = await Dialogue.get(this.id);
                const generatedDialogue = await dialogue.generateTraderDialogue(insured.traderId, insured.messageContent, this.id, insured.items);

                if (await this.sendNotificationMessage(generatedDialogue, this.id)) {
                    await this.removeInsuranceNotification();
                };
            }
        }
    }

    async getBackendCounters(character, ) {
        return character.BackendCounters;
    }

    async getBackendCounter(character, conditionId) {
        return character.BackendCounters[conditionId];
    }

    /**
     * Update values of existing backend counters, or create and add new backend counter
     * @param {string} conditionId 
     * @param {string} qid 
     * @param {int} counter 
     * @returns 
     */
    async updateBackendCounters(character, conditionId, qid, counter) {
        const backend = await this.getBackendCounter(character, conditionId)
        if (backend) {
            backend.value += counter;
            return;
        }

        character.BackendCounters[conditionId] = {
            "id": conditionId,
            "qid": qid,
            "value": counter
        }
        await this.save(character.aid);
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
            questsStatus: [],
            repeatableQuests: [],
            ragFairOffers: [], // are those current ragfair requests ?
            builds: [], // are those current weapon builds ??
            items: {},
            production: null,
            improvements: {},
            skills: this.character.Skills,
            health: this.character.Health,
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
class ProfileUtils {
}
module.exports.Profile = Profile;
module.exports.ProfileUtils = ProfileUtils;
