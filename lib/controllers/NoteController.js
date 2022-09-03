const { logger } = require("../../utilities");


class NoteController {
    static async addNote(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const playerPMC = await playerProfile.getPmc();
            playerPMC.Notes.Notes.push(
                {
                    "Time": moveAction.note.Time,
                    "Text": moveAction.note.Text
                }
            );
            await playerPMC.save();
        }
    }

    static async editNote(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const playerPMC = await playerProfile.getPmc();
            playerPMC.Notes.Notes[moveAction.index] = {
                "Time": moveAction.note.Time,
                "Text": moveAction.note.Text
            };
            await playerPMC.save();
        }
    }

    static async removeNote(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const playerPMC = await playerProfile.getPmc();
            delete playerPMC.Notes.Notes[moveAction.index];
            await playerPMC.save();
        }
    }
}

module.exports.NoteController = NoteController;
