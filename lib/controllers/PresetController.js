const { generateMongoID, logger } = require("../../utilities");


class PresetController {
    static async savePreset(moveAction = null, _reply = null, playerProfile = null) {
        const playerStorage = await playerProfile.getStorage();

        //root needs to match _id of weapon
        if (moveAction.root != moveAction.items[0]._id) {
            logger.logError(`[ROOT] ${moveAction.root} does not match [ITEM[0]] ${moveAction.items[0]._id}, fixing that.`)
            moveAction.root = moveAction.items[0]._id;
        }

        playerStorage.builds[moveAction.name] = {
            "id": await generateMongoID(),
            "name": moveAction.name,
            "root": moveAction.root,
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
