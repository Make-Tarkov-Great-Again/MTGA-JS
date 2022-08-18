const { Account } = require('../models/Account');
const { FastifyResponse } = require("../../utilities");
const { Item } = require('../models/Item');


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
        const newInventoryItemsIDs = [];

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
                const itemTemplate = await Item.get(item._tpl);
                const newItem = await itemTemplate.createAsNewItem();
                newItem._id = item._id;
                if (item.parentId) {
                    newItem.parentId = item.parentId;
                }
                if (item.slotId) {
                    newItem.slotId = item.slotId;
                }
                if (item.upd) {
                    newItem.upd = item.upd;
                }
                if (item.location) {
                    newItem.location = item.location;
                }

                character.Inventory.items.push(newItem);
            }
            newInventoryItemsIDs.push(item._id);
        }
        for (let itemIndex = character.Inventory.items.length - 1; itemIndex >= 0; itemIndex--) {
            const item = character.Inventory.items[itemIndex];
            if (!newInventoryItemsIDs.includes(item._id) && item.slotId !== "hideout" && item.parentId !== await character.getStashContainer()._id) {
                character.Inventory.items.splice(itemIndex, 1);
            }
        }
        //if (endRaidData.exit !== "survived" && endRaidData.exit !== "runner") {
            // TODO: handle insurance
            // TODO: remove quests items
            // TODO: reset counters for quest where you have to do stuff in 1 raid (like the satellite thingy in shoreline for mechanic)
        //} else {
            // TODO: quest inventory items
        //}
        await playerProfile.save();
    }
}

module.exports.RaidController = RaidController;
