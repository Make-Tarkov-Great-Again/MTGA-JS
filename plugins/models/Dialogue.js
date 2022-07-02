const { BaseModel } = require("./BaseModel");
const fs = require('fs');
const { readParsed, fileExist, stringify, writeFile } = require("../utilities");

class Dialogue extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async getDialoguePath() {
        return `./user/profiles/${this.id}/dialogue.json`;
    }


    async saveDialogue(sessionID) {
        // Check if dialogues exist in the server memory.
        if (sessionID in this.dialogues) {
            // Check if the dialogue file exists.
            if (fileExist(await this.getDialoguePath())) {
                // Check if the file was modified elsewhere.
                let statsPreSave = fs.statSync(getPath(sessionID));
                if (statsPreSave.mtimeMs == this.dialogueFileAge[sessionID]) {

                    // Compare the dialogues from server memory with the ones saved on disk.
                    let currentDialogues = this.dialogues[sessionID];
                    let savedDialogues = readParsed(await this.getDialoguePath());
                    if (stringify(currentDialogues) !== stringify(savedDialogues)) {
                        // Save the dialogues stored in memory to disk.
                        writeFile(await this.getDialoguePath(), this.dialogues[sessionID]);

                        // Reset the file age for the sessions dialogues.
                        let stats = fs.statSync(await this.getDialoguePath());
                        this.dialogueFileAge[sessionID] = stats.mtimeMs;
                        logger.logSuccess(`Dialogues for AID ${sessionID} was saved.`);
                    }
                } else {
                    //Load saved dialogues from disk.
                    this.dialogues[sessionID] = readParsed(await this.getDialoguePath());

                    // Reset the file age for the sessions dialogues.
                    let stats = fs.statSync(await this.getDialoguePath());
                    this.dialogueFileAge[sessionID] = stats.mtimeMs;
                    logger.logWarning(`Dialogues for AID ${sessionID} were modified elsewhere. Dialogue was reloaded successfully.`)
                }
            } else {
                // Save the dialogues stored in memory to disk.
                writeFile(await this.getDialoguePath(), this.dialogues[sessionID]);

                // Reset the file age for the sessions dialogues.
                let stats = fs.statSync(await this.getDialoguePath());
                this.dialogueFileAge[sessionID] = stats.mtimeMs;
                logger.logSuccess(`Dialogues for AID ${sessionID} was created and saved.`);
            }
        }
    }
}

module.exports.Dialogue = Dialogue;