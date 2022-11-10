const { logger } = require("../utilities");


class NoteController {

    static async noteActions(moveAction, reply, playerProfile) {
        switch (moveAction.Action) {
            case "AddNote":
                return this.addNote(moveAction, reply, playerProfile);
            case "EditNote":
                return this.editNote(moveAction, reply, playerProfile);
            case "DeleteNote":
                return this.removeNote(moveAction, reply, playerProfile);
            default:
                await logger.warn("[/client/game/profile/items/moving] Action " + moveAction.Action + " is not yet implemented.");
        }
    }


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
