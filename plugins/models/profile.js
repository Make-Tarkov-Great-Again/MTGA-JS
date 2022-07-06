const fs = require('fs');
const { off } = require('process');
const {
    readParsed,
    fileExist,
    logger,
    stringify,
    writeFile,
} = require("../utilities");
const { Bot, BaseModel } = require("./Index");

class Profile extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
        this.id = id;
    }

    /**
 * Check if requested nickname is available
 * @param {*} nickname 
 * @returns 
 */
    static async ifAvailableNickname(nickname) {
        const { database } = require("../../app");
        const collection = database.profiles;

        if (nickname.length < 3) { return "tooshort"; }
        for (const [key, profile] of Object.entries(collection)) {
            
            // This check needs to come first to see if profile is created, or it'll pop and error
            if (profile.character.length === 0) {
                logger.logDebug(`[CLUSTER] Character for ${key} has not been created.`);
                break;
            }

            if (profile.character.Info.Nickname === nickname) {
                return "taken";
            }
        }
        return "ok";
    }

    async getPmc() {
        return this.character;
    }

    async getDialogues() {
        return this.dialogues;
    }

    async getDissolvedDialogues() {
        const dissolvedCollection = {};
        for (const [id, dialogue] of Object.entries(this.dialogues)) {
            dissolvedCollection[id] = await dialogue.dissolve();
        }
        return dissolvedCollection;
    }

    async getScav() {
        if (this.scav) {
            return this.scav;
        } else {
            this.scav = await Bot.generatePlayerScav(this.id);
            return this.scav;
        }
    }

    async getCharacterPath() {
        return `./user/profiles/${this.id}/character.json`;
    }

    async getStoragePath() {
        return `./user/profiles/${this.id}/storage.json`;
    }

    async getDialoguePath() {
        return `./user/profiles/${this.id}/dialogue.json`;
    }

    async save() {
        await Promise.all([
            this.saveCharacter(),
            this.saveStorage(),
            this.saveDialogue()
        ])
    }

    async saveCharacter() {
        const { database } = require("../../app");

        // Check if a PMC character exists in the server memory.
        if (this.character) {
            // Check if the profile path exists
            if (fs.existsSync(await this.getCharacterPath())) {
                // Check if the file was modified elsewhere
                const statsPreSave = fs.statSync(await this.getCharacterPath());
                if (statsPreSave.mtimeMs === database.fileAge[this.id].pmc) {
                    // Compare the PMC character from server memory with the one saved on disk
                    const currentProfile = await this.character.dissolve();
                    const savedProfile = readParsed(await this.getCharacterPath());
                    if (stringify(currentProfile) !== stringify(savedProfile)) {
                        // Save the PMC character from memory to disk.
                        writeFile(await this.getCharacterPath(), stringify(currentProfile));
                        logger.logSuccess(`[CLUSTER] Profile for AID ${this.id} was saved.`);
                    } else {
                        // Skip save ?
                    }
                } else {
                    // Recreate reload
                }
            } else {
                // Save the PMC character from memory to disk.
                writeFile(await this.getCharacterPath(), stringify(await this.character.dissolve()));
            }
            // Update the savedFileAge stored in memory for the character.json.
            const statsAfterSave = fs.statSync(await this.getCharacterPath());
            database.fileAge[this.id].pmc = statsAfterSave.mtimeMs;
        }

    }

    async saveStorage() {
        const { database } = require("../../app");

        // Check if a PMC character exists in the server memory.
        if (this.storage) {
            // Check if the profile path exists
            if (fs.existsSync(await this.getStoragePath())) {
                // Check if the file was modified elsewhere
                let statsPreSave = fs.statSync(await this.getStoragePath());
                if (statsPreSave.mtimeMs == database.fileAge[this.id].pmc) {
                    // Compare the PMC storage from server memory with the one saved on disk
                    let currentProfile = await this.storage;
                    let savedProfile = readParsed(await this.getStoragePath());
                    if (stringify(currentProfile) !== stringify(savedProfile)) {
                        // Save the PMC storage from memory to disk.
                        writeFile(await this.getStoragePath(), stringify(currentProfile));
                        logger.logSuccess(`[CLUSTER] Profile for AID ${sessionID} was saved.`);
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
            database.fileAge[this.id].pmc = statsAfterSave.mtimeMs;
        }

    }

    async saveDialogue() {
        const { database } = require("../../app");

        let dialoguePath = await this.getDialoguePath();
        let dissolvedDialogues = await this.getDissolvedDialogues();

        // Check if the dialogue file exists.
        if (fileExist(dialoguePath)) {
            // Check if the file was modified elsewhere.
            let statsPreSave = fs.statSync(dialoguePath);
            if (statsPreSave.mtimeMs == database.fileAge[this.id].dialogues) {

                // Compare the dialogues from server memory with the ones saved on disk.
                let currentDialogues = dissolvedDialogues;
                let savedDialogues = readParsed(dialoguePath);
                if (stringify(currentDialogues) !== stringify(savedDialogues)) {
                    // Save the dialogues stored in memory to disk.
                    writeFile(dialoguePath, stringify(dissolvedDialogues));

                    // Reset the file age for the sessions dialogues.
                    let stats = fs.statSync(dialoguePath);
                    database.fileAge[this.id].dialogues = stats.mtimeMs;
                    logger.logSuccess(`[CLUSTER] Dialogues for AID ${this.id} was saved.`);
                }
            } else {
                // Fix reloading dialogues
            }
        } else {
            // Save the dialogues stored in memory to disk.
            writeFile(dialoguePath, stringify(dissolvedDialogues));

            // Reset the file age for the sessions dialogues.
            let stats = fs.statSync(dialoguePath);
            database.fileAge[this.id].dialogues = stats.mtimeMs;
            logger.logSuccess(`[CLUSTER] Dialogues for AID ${this.id} was created and saved.`);
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
        return calculatedLoyalty;
    }

    async getQuestStatus(questID) {
        for (const quest of this.character.Quests) {
            if (quest.qid === questID) {
                return quest.status;
            }
        }
        return "Locked";
    }
}

module.exports.Profile = Profile;
