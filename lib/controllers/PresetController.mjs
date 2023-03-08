import { Storage } from "../classes/Storage.mjs";
import { generateMongoID, logger } from "../utilities/_index.mjs";


export class PresetController {
    static async presetActions(moveAction, character) {
        switch (moveAction.Action) {
            case "SaveBuild":
                return this.savePreset(moveAction, character);
            case "RemoveBuild":
                return this.removePreset(moveAction, character);
            default:
                return logger.error(`[PresetController] ${moveAction.Action} not handled`)
        }
    }

    static async savePreset(moveAction, character) {
        const builds = Storage.getBuilds(character.aid);

        //root needs to match _id of weapon
        if (moveAction.root != moveAction.items[0]._id) {
            logger.error(`[ROOT] ${moveAction.root} does not match [ITEM[0]] ${moveAction.items[0]._id}, fixing that.`)
            moveAction.root = moveAction.items[0]._id;
        }

        const id = generateMongoID();
        builds[id] = {
            "id": id,
            "name": moveAction.name,
            "root": moveAction.root,
            "items": moveAction.items
        };

    }

    static async removePreset(moveAction, character) {
        const builds = Storage.getBuilds(character.aid);
        delete builds[moveAction.id]
    }
}
