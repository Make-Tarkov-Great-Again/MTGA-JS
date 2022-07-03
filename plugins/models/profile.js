const fs = require('fs');
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

    async getPmc() {
        return this.character;
    }

    async getScav() {
        if(this.scav) {
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

    async save() {
        await Promise.all([
            this.saveCharacter(),
            this.saveStorage()
        ])
        
        logger.logDebug(this);
    }

    async saveCharacter() {
        const { database } = require("../../app");

        // Check if a PMC character exists in the server memory.
        if (this.character) {
            // Check if the profile path exists
            if (fs.existsSync(await this.getCharacterPath())) {
                // Check if the file was modified elsewhere
                let statsPreSave = fs.statSync(await this.getCharacterPath());
                if (statsPreSave.mtimeMs == database.fileAge[this.id].pmc) {
                    // Compare the PMC character from server memory with the one saved on disk
                    let currentProfile = await this.character.dissolve();
                    let savedProfile = readParsed(await this.getCharacterPath());
                    if (stringify(currentProfile) !== stringify(savedProfile)) {
                        // Save the PMC character from memory to disk.
                        writeFile(await this.getCharacterPath(), stringify(currentProfile));
                        logger.logSuccess(`[CLUSTER] Profile for AID ${sessionID} was saved.`);
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
            let statsAfterSave = fs.statSync(await this.getCharacterPath());
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
}

module.exports.Profile = Profile;
