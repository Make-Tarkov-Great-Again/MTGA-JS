const { BaseModel } = require("./BaseModel");
const { Dialogue } = require("./Dialogue");
const { Notification } = require("./Notification");
const fs = require('fs');
const {
    readParsed, fileExist, logger, stringify,
    writeFile, generateMongoID, getCurrentTimestamp
} = require("../../utilities");


class Profile extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
        this.id = id;
    }

    async tick() {
        logger.debug(this.id);
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
     * Return the path of the dialogue.json file for this profile
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
        let cyclicUpdateDifference = null;
        const lastUpdate = await this.getLastCyclicUpdate();
        const currentTime = Date.now();

        if(typeof lastUpdate !== "undefined") {
            cyclicUpdateDifference = (currentTime - lastUpdate) / 1000;
        }

        let specialData = await this.getSpecialData()
        if(typeof specialData.hideout === "undefined") {
            specialData.hideout = {}
        }
        
        let pmc = await this.getPmc()
        await pmc.hideoutTick(specialData);

        await this.setLastCyclicUpdate(currentTime);
        await this.saveSpecial();
    }

    /**
    * Check if requested nickname is available
    * @param {string} nickname
    * @returns {Promise<String>}
    */
    static async ifAvailableNickname(nickname) {
        const profiles = await Profile.getAllWithoutKeys();
        if (!profiles)
            return "ok";
        if (nickname.length < 3)
            return "tooshort";
        for (const profile of profiles) {
            // This check needs to come first to see if profile is created, or it'll pop and error
            if (profile.character.length === 0) {
                logger.debug(`[PROFILE] Character for ${profile.id} has not been created.`);
                break;
            }
            if (profile.character.Info.Nickname === nickname)
                return "taken";
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
        await Promise.all([
            this.saveCharacter(),
            this.saveStorage(),
            this.saveDialogue(),
            this.saveSpecial()
        ]);

        // Add code to check for failure
        return true;
    }

    async saveCharacter() {
        const { database: { fileAge } } = require("../../app");

        // Check if a PMC character exists in the server memory.
        if (this.character) {
            // Check if the profile path exists
            if (fs.existsSync(await this.getCharacterPath())) {
                // Check if the file was modified elsewhere
                const statsPreSave = fs.statSync(await this.getCharacterPath());
                if (statsPreSave.mtimeMs === fileAge[this.id].character) {
                    // Compare the PMC character from server memory with the one saved on disk
                    const currentProfile = await this.character.dissolve();
                    const savedProfile = readParsed(await this.getCharacterPath());
                    if (stringify(currentProfile) !== stringify(savedProfile)) {
                        // Save the PMC character from memory to disk.
                        writeFile(await this.getCharacterPath(), stringify(currentProfile));
                        logger.success(`[PROFILE] Character for AID ${this.id} was saved.`);
                    } else {
                        logger.warn(`[PROFILE] Skipped saving character for AID ${this.id}.`);
                        // Skip save ?
                    }
                } else {
                    logger.warn(`[PROFILE] Character for AID ${this.id} requires reload.`);
                    // Recreate reload
                }
            } else {
                logger.success(`[PROFILE] Character for AID ${this.id} was saved in a newly created file.`);
                // Save the PMC character from memory to disk.
                writeFile(await this.getCharacterPath(), stringify(await this.character.dissolve()));
            }
            // Update the savedFileAge stored in memory for the character.json.
            const statsAfterSave = fs.statSync(await this.getCharacterPath());
            fileAge[this.id].character = statsAfterSave.mtimeMs;
        } else {
            logger.error(`[PROFILE] Character for AID ${this.id} does not exist.`);
        }

    }

    async saveStorage() {
        const { database: { fileAge } } = require("../../app");

        // Check if a PMC character exists in the server memory.
        if (this.storage) {
            // Check if the profile path exists
            if (fs.existsSync(await this.getStoragePath())) {
                // Check if the file was modified elsewhere
                const statsPreSave = fs.statSync(await this.getStoragePath());
                if (statsPreSave.mtimeMs === fileAge[this.id].storage) {
                    // Compare the PMC storage from server memory with the one saved on disk
                    const currentProfile = await this.storage;
                    const savedProfile = readParsed(await this.getStoragePath());
                    if (stringify(currentProfile) !== stringify(savedProfile)) {
                        // Save the PMC storage from memory to disk.
                        writeFile(await this.getStoragePath(), stringify(currentProfile));
                        logger.success(`[PROFILE] Storage for AID ${this.id} was saved.`);
                    } else {
                        // Skip save ?
                    }
                } else {
                    // Recreate reload
                }
            } else {
                // Save the PMC storage from memory to disk.
                writeFile(await this.getStoragePath(), stringify(await this.storage));
            }
            // Update the savedFileAge stored in memory for the storage.json.
            let statsAfterSave = fs.statSync(await this.getStoragePath());
            fileAge[this.id].storage = statsAfterSave.mtimeMs;
        }

    }

    async saveDialogue() {
        const { database: { fileAge } } = require("../../app");

        const dialoguePath = await this.getDialoguePath();
        const dissolvedDialogues = await this.getDissolvedDialogues();

        // Check if the dialogue file exists.
        if (fileExist(dialoguePath)) {
            // Check if the file was modified elsewhere.
            const statsPreSave = fs.statSync(dialoguePath);
            if (statsPreSave.mtimeMs === fileAge[this.id].dialogues) {

                // Compare the dialogues from server memory with the ones saved on disk.
                const currentDialogues = dissolvedDialogues;
                const savedDialogues = readParsed(dialoguePath);
                if (stringify(currentDialogues) !== stringify(savedDialogues)) {
                    // Save the dialogues stored in memory to disk.
                    writeFile(dialoguePath, stringify(dissolvedDialogues));

                    // Reset the file age for the sessions dialogues.
                    const stats = fs.statSync(dialoguePath);
                    fileAge[this.id].dialogues = stats.mtimeMs;
                    logger.success(`[PROFILE] Dialogues for AID ${this.id} was saved.`);
                }
            } else {
                // Fix reloading dialogues
            }
        } else {
            // Save the dialogues stored in memory to disk.
            writeFile(dialoguePath, stringify(dissolvedDialogues));

            // Reset the file age for the sessions dialogues.
            const stats = fs.statSync(dialoguePath);
            fileAge[this.id].dialogues = stats.mtimeMs;
            logger.logSuccess(`[PROFILE] Dialogues for AID ${this.id} was created and saved.`);
        }
    }

    async getLoyalty(traderID, traderBase) {
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
            for (const loyaltyLevel of traderBase.loyaltyLevels) {
                if (playerSaleSum >= loyaltyLevel.minSalesSum &&
                    playerStanding >= loyaltyLevel.minStanding &&
                    playerLevel >= loyaltyLevel.minLevel) {
                    calculatedLoyalty++;
                } else {
                    if (calculatedLoyalty === 0) {
                        calculatedLoyalty = 1;
                    }
                    break;
                }
            }
        } else {
            return "ragfair";
        }
        return (calculatedLoyalty - 1);
    }

    async createDialogue(id = null) {
        let dialogue;
        if (id in this.dialogues) {
            dialogue = this.dialogues[id];
        } else {
            dialogue = {
                _id: id,
                messages: [],
                pinned: false,
                new: 0,
                attachmentsNew: 0
            };
            this.dialogues[id] = dialogue;
        }

        dialogue.new += 1;

        const stashItems = {};
        if (rewards.length > 0) {
            stashItems.stash = await generateMongoID();
            stashItems.data = [];
            // other bullshit todo

            if (stashItems.data.length === 0) delete stashItems.data;
            dialogue.attachmentsNew += 1;
        }


        const message = {
            _id: await generateMongoID(),
            uid: id,
            type: messageContent.type,
            dt: await getCurrentTimestamp(),
            templateId: messageContent.templateId,
            text: messageContent.text ?? "",
            hasRewards: rewards.length > 0,
            rewardCollected: false,
            items: stashItems,
            maxStorageTime: messageContent.maxStorageTime
        };

        if (messageContent.systemData) message.systemData = messageContent.systemData;
        if (messageContent.text) message.text = messageContent.text;
        if (messageContent.profileChangeEvents || messageContent.profileChangeEvents?.length == 0) message.profileChangeEvents = messageContent.profileChangeEvents;

        dialogue.messages.push(message);

        // need to add notificationcls
        let notificationHandler = await Notification.get(this.id);
        if (!notificationHandler) {
            notificationHandler = new Notification(this.id);
        }

        await notificationHandler.sendNotification(sessionID, await notificationHandler.createNewNotification(message))
    }

    async getDialogue(id) {
        return this.dialogues[id];
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
            ragFairOffers: [], // are those current ragfair requests ?
            builds: [], // are those current weapon builds ??
            items: {},
            production: null,
            skills: await this.character.getSkills(),
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
