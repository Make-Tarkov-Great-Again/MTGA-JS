const { logger } = require("../utilities");
const { BaseModel } = require("./BaseModel");
const fs = require('fs');
const {
    readParsed,
    fileExist,
    stringify,
    writeFile,
} = require("../utilities");

class Profile extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
        this.id = id;
    }

    getCharacterPath() {
        return `./user/profiles/${this.id}/character.json`;
    }

    async save() {
        await Promise.all([
            this.saveCharacter()
        ])
        
        logger.logDebug(this);
    }

    async saveCharacter() {
        const { database } = require("../../app");

        // Check if a PMC character exists in the server memory.
        if (this.pmc) {
            // Check if the profile path exists
            if (fs.existsSync(this.getCharacterPath())) {
                // Check if the file was modified elsewhere
                let statsPreSave = fs.statSync(this.getCharacterPath());
                if (statsPreSave.mtimeMs == database.fileAge[this.id].pmc) {
                    // Compare the PMC character from server memory with the one saved on disk
                    let currentProfile = await this.pmc.dissolve();
                    let savedProfile = readParsed(this.getCharacterPath());
                    if (stringify(currentProfile) !== stringify(savedProfile)) {
                        // Save the PMC character from memory to disk.
                        writeFile(this.getCharacterPath(), stringify(currentProfile));
                        logger.logSuccess(`[CLUSTER] Profile for AID ${sessionID} was saved.`);
                    } else {
                        // Skip save ?
                    }
                } else {
                    // Recreate reload
                }
            } else {
                // Save the PMC character from memory to disk.
                writeFile(this.getCharacterPath(), stringify(await this.pmc.dissolve()));
            }
            // Update the savedFileAge stored in memory for the character.json.
            let statsAfterSave = fs.statSync(this.getCharacterPath());
            database.fileAge[this.id].pmc = statsAfterSave.mtimeMs;
        }

    }
}

module.exports.Profile = Profile;