const { Account } = require('../models/Account');
const { FastifyResponse } = require("../../utilities");


class RaidController {
    static async raidProfileSave(request, _reply) {
        const endRaidData = request.body;
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const playerProfile = await playerAccount.getProfile();
        const character = await playerProfile.getPmc();
        character.Stats = endRaidData.profile.Stats;
        character.Info.Level = endRaidData.profile.Info.Level;
        character.Info.Experience = endRaidData.profile.Info.Experience;
        character.Quests = endRaidData.profile.Quests;
        character.ConditionCounter = endRaidData.profile.ConditionCounters;

        await character.setHealth(endRaidData.health);
        character.Encyclopedia = endRaidData.profile.Encyclopedia;
        if (endRaidData.exit !== "survived" && endRaidData.exit !== "runner") {
            // TODO: remove all gear except the melee and the stuff in the prison pocket
            // TODO: handle insurance
            // TODO: remove quests items
            // TODO: reset counters for quest where you have to do stuff in 1 raid (like the satellite thingy in shoreline for mechanic)
        } else {
            // TODO: remove item that aren't in the inventory anymore
            // TODO: quest inventory items
            for (const item of endRaidData.profile.Inventory.items) {
                const playerItem = await character.getInventoryItemByID(item._id);
                if (playerItem) {
                    if (item.parentId) {
                        playerItem.parentId = item.parentId;
                    }
                    if (item.slotId) {
                        playerItem.slotId = item.slotId;
                    }
                    if (item.upd) {
                        playerItem.upd = item.upd;
                    }
                    if (item.location) {
                        playerItem.location = item.location;
                    }
                } else {
                    character.Inventory.items.push(item);
                }
            }
        }
        await playerProfile.save();
    }
}

module.exports.RaidController = RaidController;
