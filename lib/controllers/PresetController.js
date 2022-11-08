const { generateMongoID, logger } = require("../utilities");


class PresetController {
    static async savePreset(moveAction, playerProfile) {
        const builds = await playerProfile.getStorageBuilds();

        //root needs to match _id of weapon
        if (moveAction.root != moveAction.items[0]._id) {
            logger.error(`[ROOT] ${moveAction.root} does not match [ITEM[0]] ${moveAction.items[0]._id}, fixing that.`)
            moveAction.root = moveAction.items[0]._id;
        }

        const id = await generateMongoID()
        builds[id] = {
            "id": id,
            "name": moveAction.name,
            "root": moveAction.root,
            "items": moveAction.items
        };

        await playerProfile.save();
    }

    static async removePreset(moveAction, playerProfile) {
        const builds = await playerProfile.getStorageBuilds();
        delete builds[moveAction.id]

        await playerProfile.save();
    }
}

module.exports.PresetController = PresetController;
