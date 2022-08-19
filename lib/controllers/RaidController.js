const { Account } = require('../models/Account');
const { FastifyResponse } = require("../../utilities");
const { Item } = require('../models/Item');


class RaidController {
    static async raidProfileSave(request, _reply) {
        const endRaidData = request.body;
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const playerProfile = await playerAccount.getProfile();
        const character = await playerProfile.getPmc();

        await character.saveCharacterRaidProgression(endRaidData);

        const listStashItems = await character.generateListItemsInStash();

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
        // Issue: doesn't remove equipments, doesn't remove stuff from pocket (it detect it but it doesn't remove it ?), doesn't remove children of children...
        // I need to make a recursive function I guess
        const slotItems = character.Inventory.items.filter(item => item.parentId === character.Inventory.equipment._id);
        for (const slotItem of slotItems) {
            const currentSlotItems = character.Inventory.items.filter(item => item.parentId === slotItem._id);
            for (const item of currentSlotItems) {
                if (!newInventoryItemsIDs.includes(item._id)) {
                    await character.removeItem(item._id);
                }
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
