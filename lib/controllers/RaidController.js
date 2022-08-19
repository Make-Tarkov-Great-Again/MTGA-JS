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
        const stash = await character.getStashContainer();
        const listStashItems = await character.generateListItemsInContainer(stash._id); // we don't want to touch items in stash

        if (endRaidData.exit !== "survived" && endRaidData.exit !== "runner") {
            const melee = character.Inventory.items.find(item => item.slotId === "Scabbard");
            const securedContainer = character.Inventory.items.find(item => item.slotId === "SecuredContainer");
            const listSecuredContainerItems = await character.generateListItemsInContainer(character.Inventory.items.find(item => item.slotId === "SecuredContainer")._id);
            // we remove all items that aren't in melee slot, in stash or in the prison pocket
            const protecteditems = [
                await character.getEquipmentContainer(), await character.getStashContainer(),
                await character.getSortingTableContainer(), await character.getQuestRaidItemsContainer(),
                await character.getQuestStashItemsContainer(), ...listStashItems,
                melee, securedContainer, ...listSecuredContainerItems
            ];

            for (let i = character.Inventory.items.length - 1; i >= 0; i--) {
                const playerItem = character.Inventory.items[i];
                if (protecteditems.includes(playerItem)) {
                    continue;
                }
                character.Inventory.items.splice(character.Inventory.items.indexOf(playerItem), 1);
            }
        }

        //const newInventoryItemsIDs = [];
//
        //for (const item of endRaidData.profile.Inventory.items) {
        //    const playerItem = await character.getInventoryItemByID(item._id);
        //    if (playerItem) {
        //        if (item.parentId) {
        //            playerItem.parentId = item.parentId;
        //        }
        //        if (item.slotId) {
        //            playerItem.slotId = item.slotId;
        //        }
        //        if (item.upd) {
        //            playerItem.upd = item.upd;
        //        }
        //        if (item.location) {
        //            playerItem.location = item.location;
        //        }
        //    } else {
        //        const itemTemplate = await Item.get(item._tpl);
        //        const newItem = await itemTemplate.createAsNewItem();
        //        newItem._id = item._id;
        //        if (item.parentId) {
        //            newItem.parentId = item.parentId;
        //        }
        //        if (item.slotId) {
        //            newItem.slotId = item.slotId;
        //        }
        //        if (item.upd) {
        //            newItem.upd = item.upd;
        //        }
        //        if (item.location) {
        //            newItem.location = item.location;
        //        }
//
        //        character.Inventory.items.push(newItem);
        //    }
        //    newInventoryItemsIDs.push(item._id);
        //}
        //
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
