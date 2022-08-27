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
        const pockets = await character.Inventory.items.find(item => item.slotId === "Pockets");

        const protecteditems = [
            await character.getEquipmentContainer(), await character.getStashContainer(),
            await character.getSortingTableContainer(), await character.getQuestRaidItemsContainer(),
            await character.getQuestStashItemsContainer(), ...listStashItems, pockets
        ];

        for (let i = character.Inventory.items.length - 1; i >= 0; i--) {
            const playerItem = character.Inventory.items[i];
            if (protecteditems.includes(playerItem)) {
                continue;
            }
            character.Inventory.items.splice(character.Inventory.items.indexOf(playerItem), 1);
        }

        const itemsToAdd = [];
        const dead = (endRaidData.exit !== "survived" && endRaidData.exit !== "runner")
        if (dead) {
            // TODO: handle insurance
            //const map = 
            // TODO: remove quests items
            // TODO: reset counters for quest where you have to do stuff in 1 raid (like the satellite thingy in shoreline for mechanic)
            itemsToAdd.push(endRaidData.profile.Inventory.items.find(item => item.slotId === "Scabbard"));
            itemsToAdd.push(endRaidData.profile.Inventory.items.find(item => item.slotId === "SecuredContainer"));
            itemsToAdd.push(...await RaidUtilities.findAllChildrenInInventory(endRaidData.profile.Inventory, endRaidData.profile.Inventory.items.find(item => item.slotId === "SecuredContainer")._id));
        } else {
            for (const item of endRaidData.profile.Inventory.items) {
                if (item.parentId && item.slotId !== "Pockets") {
                    itemsToAdd.push(item);
                }
            }
        }
        for (const item of itemsToAdd) {
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

        await playerProfile.save();
    }
}

class RaidUtilities {
    static async findAllChildrenInInventory(inventory, containerId) {
        const items = [];
        let parentItems = await this.getItemsWithParent(inventory, containerId);
        while (parentItems.length > 0) {
            const childrenList = [];
            items.push(...parentItems);
            for (const item of parentItems) {
                childrenList.push(...await this.getItemsWithParent(inventory, item._id));
            }
            if (childrenList.length > 0) {
                parentItems = childrenList;
            } else {
                parentItems = [];
            }
        }
        return items;
    }

    static async getItemsWithParent(inventory, parentId) {
        return inventory.items.filter(item => item.parentId === parentId);
    }
}

module.exports.RaidController = RaidController;
