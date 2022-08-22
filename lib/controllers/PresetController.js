const { generateMongoID } = require("../../utilities");


class PresetController {
    static async savePreset(moveAction = null, _reply = null, playerProfile = null) {
        const playerStorage = await playerProfile.getStorage();

        playerStorage.builds[moveAction.name] = {
            "id": await generateMongoID(),
            "name": moveAction.name,
            "root": await generateMongoID(),
            "items": moveAction.items
        };

        await playerProfile.saveStorage();
    }

    static async removePreset(moveAction = null, _reply = null, playerProfile = null) {
        const playerStorage = await playerProfile.getStorage();
        delete playerStorage.builds[moveAction.name];
        await playerProfile.saveStorage();
    }
}

module.exports.PresetController = PresetController;
